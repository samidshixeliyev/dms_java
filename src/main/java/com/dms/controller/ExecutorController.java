package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.Executor;
import com.dms.service.ExecutorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/executors")
@RequiredArgsConstructor
public class ExecutorController {

    private final ExecutorService executorService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Executor>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(executorService.listAll()));
    }

    @GetMapping("/page")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<PageResponse<Executor>>> page(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(executorService.page(search, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Executor>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(executorService.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Executor>> create(@RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("İcraçı yaradıldı",
                executorService.save(null, (String) data.get("name"), (String) data.get("position"),
                        data.get("departmentId") != null ? Long.valueOf(data.get("departmentId").toString()) : null)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Executor>> update(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("İcraçı yeniləndi",
                executorService.save(id, (String) data.get("name"), (String) data.get("position"),
                        data.get("departmentId") != null ? Long.valueOf(data.get("departmentId").toString()) : null)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        executorService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("İcraçı silindi"));
    }
}
