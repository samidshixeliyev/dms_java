package com.dms.entity;

import com.dms.converter.StringBooleanConverter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "legal_acts")
@SQLRestriction("is_deleted = 0")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LegalAct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id")
    private Long organizationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", insertable = false, updatable = false)
    private Department organization;

    @Column(name = "act_type_id")
    private Long actTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "act_type_id", insertable = false, updatable = false)
    private ActType actType;

    @Column(name = "issued_by_id")
    private Long issuedById;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "issued_by_id", insertable = false, updatable = false)
    private IssuingAuthority issuedBy;

    @Column(name = "legal_act_number")
    private String legalActNumber;

    @Column(name = "legal_act_date")
    private LocalDate legalActDate;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String summary;

    @Column(name = "task_number")
    private String taskNumber;

    @Column(name = "task_description", columnDefinition = "NVARCHAR(MAX)")
    private String taskDescription;

    @Column(name = "execution_deadline")
    private LocalDate executionDeadline;

    @Column(name = "related_document_number")
    private String relatedDocumentNumber;

    @Column(name = "related_document_date")
    private LocalDate relatedDocumentDate;

    @Convert(converter = StringBooleanConverter.class)
    @Column(name = "proof_required")
    private boolean proofRequired;

    @Column(name = "created_date")
    private LocalDate createdDate;

    @Column(name = "inserted_user_id")
    private Long insertedUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inserted_user_id", insertable = false, updatable = false)
    private User insertedUser;

    @Column(name = "is_deleted")
    private boolean isDeleted;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonIgnoreProperties({"legalAct"})
    @OneToMany(mappedBy = "legalAct", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<ExecutorStatusLog> statusLogs = new ArrayList<>();

    @JsonIgnoreProperties({"legalAct"})
    @OneToMany(mappedBy = "legalAct", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<LegalActExecutorLink> executorLinks = new ArrayList<>();

    @JsonIgnoreProperties({"legalAct", "statusLog"})
    @OneToMany(mappedBy = "legalAct", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ExecutionAttachment> attachments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (createdDate == null) createdDate = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
