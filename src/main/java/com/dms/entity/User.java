package com.dms.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@SQLRestriction("is_deleted = 0")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String name;
    private String surname;
    private String email;

    @Column(name = "user_role", nullable = false)
    private String userRole;

    @Column(name = "executor_id")
    private Long executorId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "force_password_change")
    private boolean forcePasswordChange;

    @Column(name = "remember_token")
    private String rememberToken;

    @Column(name = "is_deleted")
    private boolean isDeleted;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isAdmin() { return "admin".equals(userRole); }
    public boolean isManager() { return "manager".equals(userRole); }
    public boolean isExecutorRole() { return "executor".equals(userRole); }
    public boolean canManage() { return isAdmin() || isManager(); }
}
