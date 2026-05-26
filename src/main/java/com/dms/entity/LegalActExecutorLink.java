package com.dms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "legal_act_executor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LegalActExecutorLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "legal_act_id")
    private Long legalActId;

    @Column(name = "executor_id")
    private Long executorId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "legal_act_id", insertable = false, updatable = false)
    private LegalAct legalAct;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "executor_id", insertable = false, updatable = false)
    private Executor executor;

    @Column(nullable = false)
    private String role;

    @Column(name = "task_description", columnDefinition = "NVARCHAR(MAX)")
    private String taskDescription;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  protected void onUpdate()  { updatedAt = LocalDateTime.now(); }
}
