package com.dms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "legal_act_executor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LegalActExecutorLink {

    @EmbeddedId
    private LegalActExecutorId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("legalActId")
    @JoinColumn(name = "legal_act_id")
    private LegalAct legalAct;

    @ManyToOne(fetch = FetchType.EAGER)
    @MapsId("executorId")
    @JoinColumn(name = "executor_id")
    private Executor executor;

    // "main" or "helper"
    @Column(nullable = false)
    private String role;

    @Column(name = "task_description", columnDefinition = "TEXT")
    private String taskDescription;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  protected void onUpdate()  { updatedAt = LocalDateTime.now(); }
}
