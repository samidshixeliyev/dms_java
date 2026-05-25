package com.dms.repository;

import com.dms.entity.ExecutorStatusLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ExecutorStatusLogRepository extends JpaRepository<ExecutorStatusLog, Long> {

    List<ExecutorStatusLog> findByLegalActIdOrderByCreatedAtDesc(Long legalActId);

    Optional<ExecutorStatusLog> findFirstByLegalActIdOrderByCreatedAtDesc(Long legalActId);

    @Query("SELECT l FROM ExecutorStatusLog l " +
           "WHERE l.approvalStatus = 'pending' " +
           "AND l.executionNote.note LIKE '%İcra olunub%' " +
           "AND l.legalAct.organizationId IN :orgIds")
    Page<ExecutorStatusLog> findPendingApprovals(@Param("orgIds") Collection<Long> orgIds, Pageable pageable);

    @Query("SELECT l FROM ExecutorStatusLog l " +
           "WHERE l.approvalStatus = 'pending' " +
           "AND l.executionNote.note LIKE '%İcra olunub%'")
    Page<ExecutorStatusLog> findAllPendingApprovals(Pageable pageable);

    @Query("SELECT COUNT(l) FROM ExecutorStatusLog l " +
           "WHERE l.approvalStatus = 'pending' " +
           "AND l.executionNote.note LIKE '%İcra olunub%' " +
           "AND l.legalAct.organizationId IN :orgIds")
    long countPendingApprovals(@Param("orgIds") Collection<Long> orgIds);

    @Query("SELECT l FROM ExecutorStatusLog l WHERE l.legalAct.id = :legalActId ORDER BY l.createdAt DESC")
    List<ExecutorStatusLog> findByLegalActId(@Param("legalActId") Long legalActId);
}
