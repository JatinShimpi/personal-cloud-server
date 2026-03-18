package com.personalcloud.config;

import com.personalcloud.model.User;
import com.personalcloud.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByEmail("admin@skyvault.local").isEmpty()) {
            User admin = User.builder()
                    .email("admin@skyvault.local")
                    .password(passwordEncoder.encode("admin123"))
                    .displayName("System Administrator")
                    .role("ROLE_ADMIN")
                    .storageQuota(1099511627776L) // 1TB for admin
                    .build();
            userRepository.save(admin);
            System.out.println("Default admin user created: admin@skyvault.local / admin123");
        }
    }
}
