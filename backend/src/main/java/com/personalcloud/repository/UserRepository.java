package com.personalcloud.repository;

import com.personalcloud.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(u.storageQuota) FROM User u")
    Long sumAllStorageQuotas();
}
