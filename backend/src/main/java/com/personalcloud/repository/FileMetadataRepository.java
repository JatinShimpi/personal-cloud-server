package com.personalcloud.repository;

import com.personalcloud.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUserIdOrderByUploadedAtDesc(Long userId);
    Optional<FileMetadata> findByIdAndUserId(Long id, Long userId);
}
