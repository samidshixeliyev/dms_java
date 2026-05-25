package com.dms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationLog {

    public static final String TYPE_TASK_ASSIGNED     = "task_assigned";
    public static final String TYPE_DEADLINE_REMINDER = "deadline_reminder";
    public static final String TYPE_DEADLINE_EXPIRED  = "deadline_expired";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notifiable_type", nullable = false)
    private String notifiableType;

    @Column(name = "notifiable_id", nullable = false)
    private Long notifiableId;

    @Column(nullable = false)
    private String type;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  protected void onUpdate()  { updatedAt = LocalDateTime.now(); }
}
