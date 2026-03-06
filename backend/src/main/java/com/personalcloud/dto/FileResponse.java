package com.personalcloud.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@Builder
public class FileResponse {
    private Long id;
    private String originalName;
    private Long size;
    private String contentType;
    private LocalDateTime uploadedAt;
}
