package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.service.ReportService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportService.ExecutorStat>>> report(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestParam(required = false) Long deptId) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.generateReport(user, deptId)));
    }
}
