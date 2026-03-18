package com.personalcloud.service;

import com.personalcloud.repository.FileMetadataRepository;
import com.personalcloud.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

import com.personalcloud.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class SystemService {

    @Value("${app.file.upload-dir}")
    private String uploadDir;

    private final FileMetadataRepository fileMetadataRepository;
    private final UserRepository userRepository;

    public Map<String, Object> getStorageStats(User user) {
        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir = new File(".");
        }
        
        long hardwareFreeSpace = dir.getUsableSpace();

        Long userUsage = fileMetadataRepository.sumSizeByUserId(user.getId());
        if (userUsage == null) userUsage = 0L;

        Long totalSpace = user.getStorageQuota();
        if (totalSpace == null) totalSpace = 5368709120L; // Fallback 5GB
        
        long freeSpace = totalSpace - userUsage;
        if (freeSpace < 0) freeSpace = 0;
        
        // If the hardware drive itself has less space than their logical quota, clamp it.
        if (hardwareFreeSpace < freeSpace) {
            freeSpace = hardwareFreeSpace;
        }

        Map<String, Object> personalStats = new HashMap<>();
        personalStats.put("totalSpace", totalSpace);
        personalStats.put("freeSpace", freeSpace);
        personalStats.put("usedSpace", userUsage); // Logical usage for the gauge
        personalStats.put("userUsage", userUsage);

        Long totalAllocated = userRepository.sumAllStorageQuotas();
        if (totalAllocated == null) totalAllocated = 0L;

        long globalTotalSpace = dir.getTotalSpace();
        long globalFreeSpace = globalTotalSpace - totalAllocated;
        if (globalFreeSpace < 0) globalFreeSpace = 0;

        Long publicUsage = fileMetadataRepository.sumSizePublicFiles();
        if (publicUsage == null) publicUsage = 0L;

        Map<String, Object> globalStats = new HashMap<>();
        globalStats.put("totalSpace", globalTotalSpace);
        globalStats.put("freeSpace", globalFreeSpace);
        globalStats.put("usedSpace", totalAllocated); // Allocated limits gauge
        globalStats.put("publicUsage", publicUsage);

        Map<String, Object> result = new HashMap<>();
        result.put("personal", personalStats);
        result.put("global", globalStats);
        
        return result;
    }
}
