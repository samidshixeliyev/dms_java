package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.Department;
import com.dms.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Department>>> listAll() {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.listAll()));
    }

    @GetMapping("/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<Department>>> page(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.page(search, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Department>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(departmentService.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Department>> create(@RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("Şöbə yaradıldı",
                departmentService.save(null, (String) data.get("name"),
                        data.get("parentId") != null ? Long.valueOf(data.get("parentId").toString()) : null,
                        Boolean.TRUE.equals(data.get("canAssign")))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Department>> update(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        return ResponseEntity.ok(ApiResponse.ok("Şöbə yeniləndi",
                departmentService.save(id, (String) data.get("name"),
                        data.get("parentId") != null ? Long.valueOf(data.get("parentId").toString()) : null,
                        Boolean.TRUE.equals(data.get("canAssign")))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        departmentService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Şöbə silindi"));
    }
}
