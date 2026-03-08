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
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false, defaultValue = "false") boolean isPublic,
            @RequestParam(required = false, defaultValue = "false") boolean overwrite,
            @AuthenticationPrincipal User user) {

        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        try {
            FileResponse response = fileStorageService.uploadFile(file, user.getId(), folderId, isPublic, overwrite);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if ("FILE_EXISTS_CONFLICT".equals(e.getMessage())) {
                return ResponseEntity.status(409).body(java.util.Map.of(
                    "error", "File already exists",
                    "code", "FILE_EXISTS_CONFLICT"
                ));
            }
            throw e;
        }
    }

    @GetMapping
    public ResponseEntity<List<FileResponse>> listFiles(
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false, defaultValue = "false") boolean isPublic,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(fileStorageService.listFiles(user.getId(), folderId, isPublic));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean isPublic,
            @AuthenticationPrincipal User user) {

        FileMetadata metadata = fileStorageService.getFileMetadata(id, user.getId(), isPublic);
        Resource resource = fileStorageService.downloadFile(id, user.getId(), isPublic);

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
            @RequestParam(required = false, defaultValue = "false") boolean isPublic,
            @AuthenticationPrincipal User user) {

        fileStorageService.deleteFile(id, user.getId(), isPublic);
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
