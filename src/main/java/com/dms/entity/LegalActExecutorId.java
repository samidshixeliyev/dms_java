package com.dms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class LegalActExecutorId implements Serializable {

    @Column(name = "legal_act_id")
    private Long legalActId;

    @Column(name = "executor_id")
    private Long executorId;
}
