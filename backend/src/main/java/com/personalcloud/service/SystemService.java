package com.personalcloud.service;

import com.personalcloud.repository.FileMetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SystemService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    private final FileMetadataRepository fileMetadataRepository;

    public Map<String, Object> getStorageStats(Long userId) {
        File dir = new File(uploadDir);
        // Fallback to current directory if uploadDir doesn't exist yet
        if (!dir.exists()) {
            dir = new File(".");
        }
        
        long totalSpace = dir.getTotalSpace();
        long freeSpace = dir.getUsableSpace();
        long usedSpace = totalSpace - freeSpace;

        Long userUsage = fileMetadataRepository.sumSizeByUserId(userId);
        if (userUsage == null) userUsage = 0L;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSpace", totalSpace);
        stats.put("freeSpace", freeSpace);
        stats.put("usedSpace", usedSpace);
        stats.put("userUsage", userUsage);
        
        return stats;
    }
}
