package com.personalcloud.service;

import com.personalcloud.model.Folder;
import com.personalcloud.repository.FolderRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FolderService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;
    
    private final FolderRepository folderRepository;

    private Path uploadPath;

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public Folder createFolder(String name, Long parentId, Long userId) {
        String physicalPath;
        if (parentId != null) {
            Folder parent = folderRepository.findById(parentId).orElseThrow(() -> new RuntimeException("Parent folder not found"));
            if (userId != null && !userId.equals(parent.getUserId())) {
                throw new RuntimeException("Cannot create folder inside a folder you don't own");
            }
            if (userId == null && parent.getUserId() != null) {
                throw new RuntimeException("Cannot create public folder inside a private folder");
            }
            physicalPath = parent.getPhysicalPath() + "/" + name;
        } else {
            // Root folder
            if (userId == null) {
                physicalPath = "public/" + name;
            } else {
                physicalPath = "private/" + userId + "/" + name;
            }
        }

        try {
            Path targetPath = uploadPath.resolve(physicalPath);
            Files.createDirectories(targetPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create physical directory " + physicalPath, e);
        }
        
        Folder folder = Folder.builder()
                .name(name)
                .parentId(parentId)
                .userId(userId)
                .physicalPath(physicalPath)
                .build();
                
        return folderRepository.save(folder);
    }

    public List<Folder> listFolders(Long parentId, Long userId) {
        if (userId == null) {
            // Public folders
            return parentId == null 
                ? folderRepository.findByUserIdIsNullAndParentIdIsNull()
                : folderRepository.findByUserIdIsNullAndParentId(parentId);
        } else {
            // Private folders
            return parentId == null
                ? folderRepository.findByUserIdAndParentIdIsNull(userId)
                : folderRepository.findByUserIdAndParentId(userId, parentId);
        }
    }

    public void deleteFolder(Long id, Long userId) {
        Folder folder = folderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Folder not found"));
                
        if (userId != null && !userId.equals(folder.getUserId())) {
            throw new RuntimeException("Cannot delete folder you don't own");
        }
        
        try {
            // Physically delete the directory and all its contents
            Path targetPath = uploadPath.resolve(folder.getPhysicalPath());
            if (Files.exists(targetPath)) {
                try (java.util.stream.Stream<Path> walk = Files.walk(targetPath)) {
                    walk.sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete physical directory", e);
        }
        
        // Let DB cascade constraints handle child folders and files metadata
        // Alternatively, manually delete metadata here if cascade is not configured
        // For now, assuming basic JPA deletion is sufficient or handled by FileStorageService scanning
        
        folderRepository.delete(folder);
    }
}
