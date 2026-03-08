package com.personalcloud.controller;

import com.personalcloud.model.Folder;
import com.personalcloud.model.User;
import com.personalcloud.service.FolderService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
@CrossOrigin
public class FolderController {

    private final FolderService folderService;

    @PostMapping
    public ResponseEntity<Folder> createFolder(
            @AuthenticationPrincipal User user,
            @RequestBody CreateFolderRequest request) {
        Long ownerId = request.isPublic() ? null : user.getId();
        Folder folder = folderService.createFolder(request.getName(), request.getParentId(), ownerId);
        return ResponseEntity.ok(folder);
    }

    @GetMapping
    public ResponseEntity<List<Folder>> listFolders(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) Long parentId,
            @RequestParam(required = false, defaultValue = "false") boolean isPublic) {
        Long ownerId = isPublic ? null : user.getId();
        List<Folder> folders = folderService.listFolders(parentId, ownerId);
        return ResponseEntity.ok(folders);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean isPublic) {
        Long ownerId = isPublic ? null : user.getId();
        folderService.deleteFolder(id, ownerId);
        return ResponseEntity.noContent().build();
    }
}

@Data
class CreateFolderRequest {
    private String name;
    private Long parentId;
    private boolean isPublic;
}
