package com.personalcloud.repository;

import com.personalcloud.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByUserIdAndParentId(Long userId, Long parentId);
    List<Folder> findByUserIdIsNullAndParentId(Long parentId);
    List<Folder> findByUserIdAndParentIdIsNull(Long userId);
    List<Folder> findByUserIdIsNullAndParentIdIsNull();
}
