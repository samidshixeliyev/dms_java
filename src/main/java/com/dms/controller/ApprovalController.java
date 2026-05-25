package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.ExecutorStatusLog;
import com.dms.repository.ExecutorStatusLogRepository;
import com.dms.service.ApprovalService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class ApprovalController {

    private final ApprovalService approvalService;
    private final ExecutorStatusLogRepository statusLogRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ExecutorStatusLog>>> listPending(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(approvalService.listPending(user, page, size)));
    }

    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> pendingCount(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.ok(approvalService.countPending(user)));
    }

    @PostMapping("/{statusLogId}/approve")
    public ResponseEntity<ApiResponse<ExecutorStatusLog>> approve(
            @PathVariable Long statusLogId,
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody(required = false) Map<String, String> body) {
        String note = body != null ? body.get("note") : null;
        return ResponseEntity.ok(ApiResponse.ok("Təsdiqləndi", approvalService.approve(statusLogId, user, note)));
    }

    @PostMapping("/{statusLogId}/reject")
    public ResponseEntity<ApiResponse<ExecutorStatusLog>> reject(
            @PathVariable Long statusLogId,
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Rədd edildi", approvalService.reject(statusLogId, user, body.get("note"))));
    }

    @GetMapping("/legal-act/{legalActId}")
    public ResponseEntity<ApiResponse<List<ExecutorStatusLog>>> getLegalActHistory(@PathVariable Long legalActId) {
        return ResponseEntity.ok(ApiResponse.ok(statusLogRepository.findByLegalActId(legalActId)));
    }
}
