package com.personalcloud.service;

import com.personalcloud.dto.FileResponse;
import com.personalcloud.model.FileMetadata;
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

    public FileResponse uploadFile(MultipartFile file, Long userId) {
        String originalName = file.getOriginalFilename();
        String storedName = UUID.randomUUID().toString() + getExtension(originalName);

        try {
            Path targetLocation = uploadPath.resolve(storedName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not store file " + originalName, e);
        }

        FileMetadata metadata = FileMetadata.builder()
                .originalName(originalName)
                .storedName(storedName)
                .size(file.getSize())
                .contentType(file.getContentType())
                .userId(userId)
                .build();

        metadata = fileMetadataRepository.save(metadata);

        return toResponse(metadata);
    }

    /**
     * Scans the upload directory (including symlinked subdirectories) for files
     * not yet tracked in the database. Registers them so they appear in the UI.
     */
    public int scanDirectory(Long userId) {
        // Get all stored names already tracked in DB
        Set<String> trackedNames = fileMetadataRepository.findByUserIdOrderByUploadedAtDesc(userId)
                .stream()
                .map(FileMetadata::getStoredName)
                .collect(Collectors.toSet());

        int newFilesCount = 0;

        try (Stream<Path> walker = Files.walk(uploadPath, FileVisitOption.FOLLOW_LINKS)) {
            List<Path> files = walker
                    .filter(Files::isRegularFile)
                    .collect(Collectors.toList());

            for (Path filePath : files) {
                // storedName is the relative path from the upload root
                String storedName = uploadPath.relativize(filePath).toString().replace('\\', '/');

                if (!trackedNames.contains(storedName)) {
                    String originalName = filePath.getFileName().toString();
                    long size = Files.size(filePath);
                    String contentType;
                    try {
                        contentType = Files.probeContentType(filePath);
                    } catch (IOException e) {
                        contentType = "application/octet-stream";
                    }
                    if (contentType == null) {
                        contentType = "application/octet-stream";
                    }

                    FileMetadata metadata = FileMetadata.builder()
                            .originalName(originalName)
                            .storedName(storedName)
                            .size(size)
                            .contentType(contentType)
                            .userId(userId)
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

    public List<FileResponse> listFiles(Long userId) {
        return fileMetadataRepository.findByUserIdOrderByUploadedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public Resource downloadFile(Long fileId, Long userId) {
        FileMetadata metadata = fileMetadataRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found"));

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

    public FileMetadata getFileMetadata(Long fileId, Long userId) {
        return fileMetadataRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found"));
    }

    public void deleteFile(Long fileId, Long userId) {
        FileMetadata metadata = fileMetadataRepository.findByIdAndUserId(fileId, userId)
                .orElseThrow(() -> new RuntimeException("File not found"));

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
