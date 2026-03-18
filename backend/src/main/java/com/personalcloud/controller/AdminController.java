package com.personalcloud.controller;

import com.personalcloud.model.User;
import com.personalcloud.repository.UserRepository;
import com.personalcloud.repository.FileMetadataRepository;
import com.personalcloud.service.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@CrossOrigin
public class AdminController {

    private final UserRepository userRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    record AdminUserDto(Long id, String email, String displayName, String role, Long storageQuota, Long usedStorage) {}

    record CreateUserDto(
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        String email,

        @NotBlank(message = "Password is required")
        String password,

        @NotBlank(message = "Display name is required")
        String displayName,

        Long storageQuota) {}

    @GetMapping
    public ResponseEntity<List<AdminUserDto>> getAllUsers() {
        List<AdminUserDto> users = userRepository.findAll().stream().map(user -> {
            Long used = fileMetadataRepository.sumSizeByUserId(user.getId());
            if (used == null) used = 0L;
            return new AdminUserDto(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getStorageQuota(),
                used
            );
        }).collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody CreateUserDto request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already in use");
        }

        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .displayName(request.displayName())
                .role("ROLE_USER")
                .storageQuota(request.storageQuota() != null ? request.storageQuota() : 5368709120L)
                .build();

        user = userRepository.save(user);

        // Dispatch welcome email asynchronously
        try {
            emailService.sendWelcomeEmail(user.getEmail(), request.password());
        } catch (Exception e) {
            System.err.println("Failed to directly send email to " + user.getEmail() + " : " + e.getMessage());
        }

        return ResponseEntity.ok(new AdminUserDto(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(), user.getStorageQuota(), 0L));
    }

    @PutMapping("/{id}/quota")
    public ResponseEntity<?> updateQuota(@PathVariable("id") Long id, @RequestBody java.util.Map<String, Long> request) {
        Long newQuota = request.get("storageQuota");
        if (newQuota == null) {
            return ResponseEntity.badRequest().body("Missing storageQuota");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setStorageQuota(newQuota);
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }
}
