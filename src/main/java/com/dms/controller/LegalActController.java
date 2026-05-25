package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.LegalAct;
import com.dms.service.LegalActService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/legal-acts")
@RequiredArgsConstructor
public class LegalActController {

    private final LegalActService legalActService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<LegalAct>>> list(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(required = false) Long orgId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Long actTypeId,
            @RequestParam(required = false) Long issuedById,
            @RequestParam(required = false) Long executorId,
            @RequestParam(required = false) String deadlineStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
            legalActService.list(user, orgId, search, actTypeId, issuedById, executorId, deadlineStatus, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<LegalAct>> create(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("Hüquqi akt yaradıldı", legalActService.create(user, data)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LegalAct>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(legalActService.findById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<LegalAct>> update(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("Hüquqi akt yeniləndi", legalActService.update(id, user, data)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        legalActService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Hüquqi akt silindi"));
    }

    @PostMapping("/{id}/toggle-proof")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<LegalAct>> toggleProof(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(legalActService.toggleProof(id)));
    }

    @GetMapping("/export-excel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<byte[]> exportExcel(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(required = false) Long orgId,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Long actTypeId,
            @RequestParam(required = false) Long issuedById,
            @RequestParam(required = false) Long executorId,
            @RequestParam(required = false) String deadlineStatus) {
        byte[] bytes = legalActService.exportExcel(user, orgId, search, actTypeId, issuedById, executorId, deadlineStatus);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"huquqi-aktlar.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}
