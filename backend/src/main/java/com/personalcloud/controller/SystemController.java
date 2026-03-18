package com.personalcloud.controller;

import com.personalcloud.model.User;
import com.personalcloud.service.SystemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@CrossOrigin
public class SystemController {

    private final SystemService systemService;

    @GetMapping("/storage")
    public ResponseEntity<Map<String, Object>> getStorageStats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(systemService.getStorageStats(user));
    }
}
