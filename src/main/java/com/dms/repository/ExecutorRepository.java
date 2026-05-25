package com.dms.repository;

import com.dms.entity.Executor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ExecutorRepository extends JpaRepository<Executor, Long> {

    List<Executor> findByIsDeletedFalse();

    @Query("SELECT e FROM Executor e WHERE e.isDeleted = false AND " +
           "(:search IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Executor> searchActive(@Param("search") String search, Pageable pageable);

    List<Executor> findByDepartmentIdAndIsDeletedFalse(Long departmentId);

    @Query("SELECT e FROM Executor e WHERE e.isDeleted = false AND e.departmentId IN :deptIds ORDER BY e.name")
    List<Executor> findByDepartmentIds(@Param("deptIds") Collection<Long> deptIds);

    @Query("SELECT e FROM Executor e WHERE e.isDeleted = false ORDER BY e.name")
    List<Executor> findAllActive();
}
