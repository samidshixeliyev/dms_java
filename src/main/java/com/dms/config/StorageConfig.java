package com.dms.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@Getter
public class StorageConfig {

    @Value("${app.storage.base-path:/app/storage}")
    private String basePath;

    public Path getAttachmentsPath() {
        return Paths.get(basePath, "attachments");
    }
}
