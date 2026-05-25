package com.dms.repository;

import com.dms.entity.ExecutionAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExecutionAttachmentRepository extends JpaRepository<ExecutionAttachment, Long> {

    List<ExecutionAttachment> findByLegalActId(Long legalActId);

    List<ExecutionAttachment> findByStatusLogId(Long statusLogId);
}
