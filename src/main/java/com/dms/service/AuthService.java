package com.dms.service;

import com.dms.dto.ApiResponse;
import com.dms.entity.User;
import com.dms.exception.AppException;
import com.dms.repository.UserRepository;
import com.dms.security.JwtService;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    public Map<String, Object> login(String username, String password, String ip) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));

        UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", userDetails.getRole());
        claims.put("mustChangePassword", userDetails.isMustChangePassword());
        claims.put("userId", userDetails.getId());
        claims.put("executorId", userDetails.getExecutorId());
        claims.put("departmentId", userDetails.getDepartmentId());

        String token = jwtService.generateToken(username, claims);
        activityLogService.log(userDetails.getId(), "login", "Sistemə daxil oldu", ip);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", Map.of(
                "id", userDetails.getId(),
                "username", userDetails.getUsername(),
                "role", userDetails.getRole(),
                "mustChangePassword", userDetails.isMustChangePassword(),
                "executorId", userDetails.getExecutorId() != null ? userDetails.getExecutorId() : "",
                "departmentId", userDetails.getDepartmentId() != null ? userDetails.getDepartmentId() : ""
        ));
        return result;
    }

    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("İstifadəçi tapılmadı", HttpStatus.NOT_FOUND));

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new AppException("Mövcud şifrə yanlışdır");
        }

        validatePasswordStrength(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void forceChangePassword(Long userId, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException("İstifadəçi tapılmadı", HttpStatus.NOT_FOUND));

        validatePasswordStrength(newPassword);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setForcePasswordChange(false);
        userRepository.save(user);
    }

    public static void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new AppException("Şifrə minimum 8 simvoldan ibarət olmalıdır");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new AppException("Şifrədə ən azı bir böyük hərf olmalıdır");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new AppException("Şifrədə ən azı bir kiçik hərf olmalıdır");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            throw new AppException("Şifrədə ən azı bir xüsusi simvol olmalıdır");
        }
    }
}
