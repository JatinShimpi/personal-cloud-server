package com.personalcloud.controller;

import com.personalcloud.dto.FileResponse;
import com.personalcloud.model.FileMetadata;
import com.personalcloud.model.User;
import com.personalcloud.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    public ResponseEntity<FileResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {

        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        FileResponse response = fileStorageService.uploadFile(file, user.getId());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<FileResponse>> listFiles(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(fileStorageService.listFiles(user.getId()));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        FileMetadata metadata = fileStorageService.getFileMetadata(id, user.getId());
        Resource resource = fileStorageService.downloadFile(id, user.getId());

        String contentType = metadata.getContentType() != null ? metadata.getContentType() : "application/octet-stream";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + metadata.getOriginalName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteFile(
            @PathVariable Long id,
            @AuthenticationPrincipal User user) {

        fileStorageService.deleteFile(id, user.getId());
        return ResponseEntity.ok(Map.of("message", "File deleted successfully"));
    }

    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> scanDirectory(@AuthenticationPrincipal User user) {
        int count = fileStorageService.scanDirectory(user.getId());
        return ResponseEntity.ok(Map.of(
                "message", "Scan complete",
                "newFiles", count
        ));
    }
}
