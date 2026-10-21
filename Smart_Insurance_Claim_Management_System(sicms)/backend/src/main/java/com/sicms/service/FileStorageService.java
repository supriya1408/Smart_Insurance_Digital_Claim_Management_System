package com.sicms.service;

import com.sicms.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

/** Stores claim documents on local disk (swap for Amazon S3 in production). */
@Service
public class FileStorageService {
    private static final Set<String> ALLOWED_EXT = Set.of("pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx", "txt");

    private final Path root;

    public FileStorageService(@Value("${app.upload-dir:./uploads}") String uploadDir) throws IOException {
        this.root = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    public String store(Long claimId, MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose a file to upload");
        String original = Paths.get(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename())
                .getFileName().toString();
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "";
        if (!ALLOWED_EXT.contains(ext)) {
            throw ApiException.badRequest("File type ." + ext + " is not allowed. Allowed: " + ALLOWED_EXT);
        }
        String key = "claim-" + claimId + "/" + UUID.randomUUID() + "." + ext;
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) throw ApiException.badRequest("Invalid file path");
        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Could not store file");
        }
        return key;
    }

    public Resource load(String key) {
        try {
            Path p = root.resolve(key).normalize();
            Resource r = new UrlResource(p.toUri());
            if (!p.startsWith(root) || !r.exists()) throw ApiException.notFound("File");
            return r;
        } catch (java.net.MalformedURLException e) {
            throw ApiException.notFound("File");
        }
    }
}
