package com.dms.repository;

import com.dms.entity.Department;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findByIsDeletedFalse();

    @Query("SELECT d FROM Department d WHERE d.isDeleted = false AND " +
           "(:search IS NULL OR LOWER(d.name) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<Department> searchActive(@Param("search") String search, Pageable pageable);

    List<Department> findByParentIdAndIsDeletedFalse(Long parentId);

    List<Department> findByCanAssignTrueAndIsDeletedFalse();

    @Query("SELECT d FROM Department d WHERE d.isDeleted = false ORDER BY d.name")
    List<Department> findAllActive();
}
