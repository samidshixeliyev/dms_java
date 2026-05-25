package com.dms.repository;

import com.dms.entity.LegalAct;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LegalActRepository extends JpaRepository<LegalAct, Long>, JpaSpecificationExecutor<LegalAct> {

    @Query("SELECT la FROM LegalAct la WHERE la.organizationId IN :orgIds ORDER BY la.createdAt DESC")
    Page<LegalAct> findByOrganizationIds(@Param("orgIds") Collection<Long> orgIds, Pageable pageable);

    @Query("SELECT la FROM LegalAct la ORDER BY la.createdAt DESC")
    Page<LegalAct> findAllActive(Pageable pageable);

    @Query("SELECT COUNT(la) > 0 FROM LegalAct la WHERE la.actTypeId = :actTypeId " +
           "AND la.legalActNumber = :number AND YEAR(la.legalActDate) = :year " +
           "AND (:excludeId IS NULL OR la.id <> :excludeId)")
    boolean existsByActTypeNumberYear(@Param("actTypeId") Long actTypeId,
                                      @Param("number") String number,
                                      @Param("year") int year,
                                      @Param("excludeId") Long excludeId);

    @Query("SELECT la FROM LegalAct la WHERE la.executionDeadline BETWEEN :from AND :to")
    List<LegalAct> findByDeadlineBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT DISTINCT la FROM LegalAct la JOIN la.executorLinks el WHERE el.executorId IN :executorIds")
    Page<LegalAct> findByExecutorIds(@Param("executorIds") Collection<Long> executorIds, Pageable pageable);
}
