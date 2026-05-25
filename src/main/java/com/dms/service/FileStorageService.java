package com.dms.service;

import com.dms.config.StorageConfig;
import com.dms.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final StorageConfig storageConfig;

    public String store(MultipartFile file, String subDir) {
        try {
            Path dir = storageConfig.getAttachmentsPath().resolve(subDir);
            Files.createDirectories(dir);

            String ext = "";
            String originalName = file.getOriginalFilename();
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID() + ext;
            Path target = dir.resolve(fileName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return subDir + "/" + fileName;
        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new AppException("Fayl saxlanılarkən xəta baş verdi", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Path resolve(String relativePath) {
        return storageConfig.getAttachmentsPath().resolve(relativePath);
    }

    public void delete(String relativePath) {
        try {
            Path file = storageConfig.getAttachmentsPath().resolve(relativePath);
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", relativePath);
        }
    }
}
