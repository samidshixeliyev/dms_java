package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.entity.Announcement;
import com.dms.service.AnnouncementService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Announcement>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.listAll()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Announcement>>> listActive() {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.listActive()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Announcement>> create(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Elan yaradıldı",
                announcementService.create(user.getId(), body.get("title"), body.get("message"))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Announcement>> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Elan yeniləndi",
                announcementService.update(id, body.get("title"), body.get("message"))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        announcementService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Elan silindi"));
    }

    @PostMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Announcement>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(announcementService.toggle(id)));
    }
}
