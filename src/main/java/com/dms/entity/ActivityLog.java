package com.dms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false)
    private String action;

    @Column(name = "subject_type")
    private String subjectType;

    @Column(name = "subject_id")
    private Long subjectId;

    @Column(nullable = false)
    private String description;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  protected void onUpdate()  { updatedAt = LocalDateTime.now(); }

    public static ActivityLog of(Long userId, String action, String description, String subjectType, Long subjectId, String ip) {
        return ActivityLog.builder()
                .userId(userId)
                .action(action)
                .description(description)
                .subjectType(subjectType)
                .subjectId(subjectId)
                .ipAddress(ip)
                .build();
    }
}
