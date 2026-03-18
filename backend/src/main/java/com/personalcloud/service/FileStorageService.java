package com.personalcloud.service;

import com.personalcloud.dto.FileResponse;
import com.personalcloud.model.FileMetadata;
import com.personalcloud.model.Folder;
import com.personalcloud.repository.FileMetadataRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    private final FileMetadataRepository fileMetadataRepository;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    public FileResponse uploadFile(MultipartFile file, Long userId, Long folderId, boolean isPublic, boolean overwrite) {
        String originalName = file.getOriginalFilename();
        if (originalName == null) originalName = "unnamed_file";
        
        String physicalPath;
        if (folderId != null) {
            Folder folder = com.personalcloud.util.ContextProvider.getBean(com.personalcloud.repository.FolderRepository.class).findById(folderId)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
            physicalPath = folder.getPhysicalPath() + "/" + originalName;
        } else {
            // Root
            if (isPublic) {
                physicalPath = "public/" + originalName;
            } else {
                physicalPath = "private/" + userId + "/" + originalName;
            }
        }
        
        // CHECK STORAGE QUOTA
        if (userId != null) {
            com.personalcloud.model.User user = com.personalcloud.util.ContextProvider.getBean(com.personalcloud.repository.UserRepository.class).findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            Long quota = user.getStorageQuota();
            if (quota != null && quota > 0) {
                Long used = fileMetadataRepository.sumSizeByUserId(userId);
                if (used == null) used = 0L;
                if (used + file.getSize() > quota) {
                    throw new RuntimeException("STORAGE_LIMIT_EXCEEDED");
                }
            }
        }

        try {
            Path targetLocation = uploadPath.resolve(physicalPath);
            
            // Create directories if they don't exist
            Files.createDirectories(targetLocation.getParent());
            
            if (Files.exists(targetLocation) && !overwrite) {
                throw new RuntimeException("FILE_EXISTS_CONFLICT"); // Handled specially by controller
            }
            
            long usableSpace = Files.getFileStore(targetLocation.getParent()).getUsableSpace();
            if (usableSpace < file.getSize()) {
                throw new RuntimeException("Insufficient storage space on the server.");
            }
            
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file " + originalName, e);
        }

        Long ownerId = isPublic ? null : userId;

        // Check if metadata already exists (for overwrite)
        FileMetadata metadata = fileMetadataRepository.findByStoredName(physicalPath).orElse(null);
        
        if (metadata == null) {
            metadata = FileMetadata.builder()
                    .originalName(originalName)
                    .storedName(physicalPath)
                    .size(file.getSize())
                    .contentType(file.getContentType())
                    .folderId(folderId)
                    .userId(ownerId)
                    .build();
        } else {
            metadata.setSize(file.getSize());
            metadata.setContentType(file.getContentType());
            // uploadedAt is not updated to keep history, or update explicitly if needed
        }

        metadata = fileMetadataRepository.save(metadata);

        return toResponse(metadata);
    }

    /**
     * Scans the upload directory for files not tracked in the database,
     * building up Folder entities and FileMetadata.
     */
    public int scanDirectory(Long userId) {
        // Find existing stored names (relative physical paths)
        Set<String> trackedNames = fileMetadataRepository.findByUserIdOrderByUploadedAtDesc(userId)
                .stream()
                .map(FileMetadata::getStoredName)
                .collect(Collectors.toSet());

        int newFilesCount = 0;
        
        Path userRoot = uploadPath.resolve("private/" + userId);
        if (!Files.exists(userRoot)) {
             try {
                 Files.createDirectories(userRoot);
             } catch (IOException e) {
                 return 0; // cannot scan if root doesn't exist
             }
        }

        try (Stream<Path> walker = Files.walk(userRoot)) {
            List<Path> files = walker
                    .filter(Files::isRegularFile)
                    .collect(Collectors.toList());

            for (Path filePath : files) {
                String storedName = uploadPath.relativize(filePath).toString().replace('\\', '/');

                if (!trackedNames.contains(storedName)) {
                    // It's a new file. We need to optionally create its parent Folder entities.
                    Long folderId = syncFoldersToDb(filePath.getParent(), userId, "private/" + userId);

                    String originalName = filePath.getFileName().toString();
                    long size = Files.size(filePath);
                    String contentType = getContentType(filePath);

                    FileMetadata metadata = FileMetadata.builder()
                            .originalName(originalName)
                            .storedName(storedName)
                            .size(size)
                            .contentType(contentType)
                            .userId(userId)
                            .folderId(folderId)
                            .build();

                    fileMetadataRepository.save(metadata);
                    newFilesCount++;
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to scan directory: " + e.getMessage(), e);
        }

        return newFilesCount;
    }

    private String getContentType(Path filePath) {
        try {
            String ct = Files.probeContentType(filePath);
            return ct != null ? ct : "application/octet-stream";
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    /**
     * Recursively makes sure physical folders exist as DB entities.
     * Returns the terminal folder ID, or null if it's the root.
     */
    private Long syncFoldersToDb(Path dirPath, Long userId, String rootPrefix) {
        String physicalPath = uploadPath.relativize(dirPath).toString().replace('\\', '/');
        
        if (physicalPath.equals(rootPrefix)) {
            return null; // It's in the root
        }

        // Check if this folder exists
        com.personalcloud.repository.FolderRepository folderRepo = com.personalcloud.util.ContextProvider.getBean(com.personalcloud.repository.FolderRepository.class);
        
        Optional<Folder> existingFolder = folderRepo.findAll().stream()
            .filter(f -> physicalPath.equals(f.getPhysicalPath()))
            .findFirst();

        if (existingFolder.isPresent()) {
            return existingFolder.get().getId();
        }

        // Folder doesn't exist in DB. Recursively sync parent first.
        Long parentId = syncFoldersToDb(dirPath.getParent(), userId, rootPrefix);
        
        Folder newFolder = Folder.builder()
                .name(dirPath.getFileName().toString())
                .parentId(parentId)
                .userId(userId)
                .physicalPath(physicalPath)
                .build();
                
        return folderRepo.save(newFolder).getId();
    }

    public List<FileResponse> listFiles(Long userId, Long folderId, boolean isPublic) {
        List<FileMetadata> files;
        if (isPublic) {
            files = (folderId == null) 
                ? fileMetadataRepository.findByUserIdIsNullAndFolderIdIsNullOrderByUploadedAtDesc()
                : fileMetadataRepository.findByUserIdIsNullAndFolderIdOrderByUploadedAtDesc(folderId);
        } else {
            files = (folderId == null)
                ? fileMetadataRepository.findByUserIdAndFolderIdIsNullOrderByUploadedAtDesc(userId)
                : fileMetadataRepository.findByUserIdAndFolderIdOrderByUploadedAtDesc(userId, folderId);
        }
        return files.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Resource downloadFile(Long fileId, Long userId, boolean isPublic) {
        FileMetadata metadata = getFileMetadata(fileId, userId, isPublic);

        try {
            Path filePath = uploadPath.resolve(metadata.getStoredName()).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found on disk");
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("File not found", e);
        }
    }

    public FileMetadata getFileMetadata(Long fileId, Long userId, boolean isPublic) {
        return isPublic 
            ? fileMetadataRepository.findByIdAndUserIdIsNull(fileId).orElseThrow(() -> new RuntimeException("Public file not found"))
            : fileMetadataRepository.findByIdAndUserId(fileId, userId).orElseThrow(() -> new RuntimeException("File not found"));
    }

    public void deleteFile(Long fileId, Long userId, boolean isPublic) {
        FileMetadata metadata = getFileMetadata(fileId, userId, isPublic);

        try {
            Path filePath = uploadPath.resolve(metadata.getStoredName()).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Could not delete file", e);
        }

        fileMetadataRepository.delete(metadata);
    }

    private String getExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }

    private FileResponse toResponse(FileMetadata metadata) {
        return FileResponse.builder()
                .id(metadata.getId())
                .originalName(metadata.getOriginalName())
                .size(metadata.getSize())
                .contentType(metadata.getContentType())
                .uploadedAt(metadata.getUploadedAt())
                .build();
    }
}
