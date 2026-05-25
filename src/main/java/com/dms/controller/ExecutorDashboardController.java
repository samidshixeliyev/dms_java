package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.*;
import com.dms.service.ExecutorDashboardService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.util.List;

@RestController
@RequestMapping("/api/executor")
@RequiredArgsConstructor
public class ExecutorDashboardController {

    private final ExecutorDashboardService dashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<PageResponse<LegalAct>>> list(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.listTasks(user, page, size)));
    }

    @GetMapping("/legal-acts/{id}")
    public ResponseEntity<ApiResponse<LegalAct>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getTaskDetail(id)));
    }

    @PostMapping(value = "/legal-acts/{id}/status", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ExecutorStatusLog>> submitStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestPart("executionNoteId") String executionNoteId,
            @RequestPart(value = "customNote", required = false) String customNote,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        ExecutorStatusLog log = dashboardService.submitStatus(
                id, user, Long.valueOf(executionNoteId), customNote, files);
        return ResponseEntity.ok(ApiResponse.ok("Status göndərildi", log));
    }

    @PostMapping("/legal-acts/{id}/withdraw-status")
    public ResponseEntity<ApiResponse<Void>> withdrawStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl user) {
        dashboardService.withdrawStatus(id, user);
        return ResponseEntity.ok(ApiResponse.ok("Status geri alındı"));
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long attachmentId) throws IOException {
        ExecutionAttachment att = dashboardService.getAttachment(attachmentId);
        java.nio.file.Path filePath = dashboardService.resolveFile(att);
        Resource resource = new PathResource(filePath);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + att.getOriginalName() + "\"")
                .contentType(MediaType.parseMediaType(att.getMimeType() != null ? att.getMimeType() : "application/octet-stream"))
                .contentLength(att.getFileSize())
                .body(resource);
    }

    @GetMapping("/attachments/{attachmentId}/preview")
    public ResponseEntity<Resource> preview(@PathVariable Long attachmentId) throws IOException {
        ExecutionAttachment att = dashboardService.getAttachment(attachmentId);
        java.nio.file.Path filePath = dashboardService.resolveFile(att);
        Resource resource = new PathResource(filePath);

        String mediaType = att.getMimeType() != null ? att.getMimeType() : "application/octet-stream";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + att.getOriginalName() + "\"")
                .contentType(MediaType.parseMediaType(mediaType))
                .body(resource);
    }
}
