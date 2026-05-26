package com.dms.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "executor_status_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExecutorStatusLog {

    public static final String APPROVAL_PENDING  = "pending";
    public static final String APPROVAL_APPROVED = "approved";
    public static final String APPROVAL_REJECTED = "rejected";
    public static final String APPROVAL_PARTIAL  = "partial";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "legal_act_id", nullable = false)
    private LegalAct legalAct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "execution_note_id")
    private ExecutionNote executionNote;

    @Column(name = "custom_note", columnDefinition = "TEXT")
    private String customNote;

    @Column(name = "approval_status")
    private String approvalStatus;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approval_note", columnDefinition = "TEXT")
    private String approvalNote;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnoreProperties({"statusLog", "legalAct"})
    @OneToMany(mappedBy = "statusLog", fetch = FetchType.LAZY)
    @Builder.Default
    private List<ExecutionAttachment> attachments = new ArrayList<>();

    @PrePersist protected void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate  protected void onUpdate()  { updatedAt = LocalDateTime.now(); }

    public boolean isPending()  { return APPROVAL_PENDING.equals(approvalStatus); }
    public boolean isApproved() { return APPROVAL_APPROVED.equals(approvalStatus); }
    public boolean isRejected() { return APPROVAL_REJECTED.equals(approvalStatus); }

    public boolean isExecutionComplete() {
        return executionNote != null &&
               executionNote.getNote() != null &&
               executionNote.getNote().contains("İcra olunub");
    }
}
