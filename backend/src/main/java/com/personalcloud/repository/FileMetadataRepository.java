package com.personalcloud.repository;

import com.personalcloud.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findByUserIdOrderByUploadedAtDesc(Long userId);
    Optional<FileMetadata> findByIdAndUserId(Long id, Long userId);
    Optional<FileMetadata> findByIdAndUserIdIsNull(Long id);
    Optional<FileMetadata> findByStoredName(String storedName);

    List<FileMetadata> findByUserIdAndFolderIdOrderByUploadedAtDesc(Long userId, Long folderId);
    List<FileMetadata> findByUserIdAndFolderIdIsNullOrderByUploadedAtDesc(Long userId);
    List<FileMetadata> findByUserIdIsNullAndFolderIdIsNullOrderByUploadedAtDesc();
    List<FileMetadata> findByUserIdIsNullAndFolderIdOrderByUploadedAtDesc(Long folderId);

    @Query("SELECT SUM(f.size) FROM FileMetadata f WHERE f.userId = :userId")
    Long sumSizeByUserId(@Param("userId") Long userId);
}
