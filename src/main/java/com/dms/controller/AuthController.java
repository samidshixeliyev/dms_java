package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.service.AuthService;
import com.dms.security.UserDetailsImpl;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        Map<String, Object> result = authService.login(body.get("username"), body.get("password"), ip);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, String> body) {
        authService.changePassword(user.getId(), body.get("currentPassword"), body.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.ok("Şifrə uğurla dəyişdirildi"));
    }

    @PostMapping("/force-change-password")
    public ResponseEntity<ApiResponse<Void>> forceChangePassword(
            @AuthenticationPrincipal UserDetailsImpl user,
            @RequestBody Map<String, String> body) {
        authService.forceChangePassword(user.getId(), body.get("newPassword"));
        return ResponseEntity.ok(ApiResponse.ok("Şifrə uğurla dəyişdirildi"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.ok("Çıxış edildi"));
    }
}
