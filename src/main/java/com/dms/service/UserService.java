package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.User;
import com.dms.exception.AppException;
import com.dms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PageResponse<User> list(String search, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PageResponse.from(userRepository.searchActive(search, pageable));
    }

    public User findById(Long id) {
        return userRepository.findById(id)
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> new AppException("İstifadəçi tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public User create(Map<String, Object> data) {
        String username = (String) data.get("username");
        if (userRepository.existsByUsernameAndIsDeletedFalse(username)) {
            throw new AppException("Bu istifadəçi adı artıq mövcuddur");
        }

        String password = (String) data.get("password");
        AuthService.validatePasswordStrength(password);

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .name((String) data.get("name"))
                .surname((String) data.get("surname"))
                .email((String) data.get("email"))
                .userRole((String) data.get("userRole"))
                .executorId(data.get("executorId") != null ? Long.valueOf(data.get("executorId").toString()) : null)
                .departmentId(data.get("departmentId") != null ? Long.valueOf(data.get("departmentId").toString()) : null)
                .forcePasswordChange(true)
                .isDeleted(false)
                .build();

        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, Map<String, Object> data) {
        User user = findById(id);

        if (data.containsKey("name")) user.setName((String) data.get("name"));
        if (data.containsKey("surname")) user.setSurname((String) data.get("surname"));
        if (data.containsKey("email")) user.setEmail((String) data.get("email"));
        if (data.containsKey("userRole")) user.setUserRole((String) data.get("userRole"));
        if (data.containsKey("executorId")) {
            user.setExecutorId(data.get("executorId") != null ? Long.valueOf(data.get("executorId").toString()) : null);
        }
        if (data.containsKey("departmentId")) {
            user.setDepartmentId(data.get("departmentId") != null ? Integer.valueOf(data.get("departmentId").toString()) : null);
        }
        if (data.get("password") != null && !data.get("password").toString().isBlank()) {
            AuthService.validatePasswordStrength(data.get("password").toString());
            user.setPassword(passwordEncoder.encode(data.get("password").toString()));
        }

        return userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = findById(id);
        user.setDeleted(true);
        userRepository.save(user);
    }

    public boolean usernameExists(String username) {
        return userRepository.existsByUsernameAndIsDeletedFalse(username);
    }

    public boolean departmentHasManager(Long deptId) {
        return userRepository.findManagerByDepartment(deptId).isPresent();
    }
}
