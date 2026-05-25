package com.dms.repository;

import com.dms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameAndIsDeletedFalse(String username);

    boolean existsByUsernameAndIsDeletedFalse(String username);

    @Query("SELECT u FROM User u WHERE u.isDeleted = false AND " +
           "(:search IS NULL OR LOWER(u.name) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(u.surname) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<User> searchActive(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.isDeleted = false AND u.departmentId = :deptId AND u.userRole = 'manager'")
    Optional<User> findManagerByDepartment(@Param("deptId") Long deptId);

    @Query("SELECT u FROM User u WHERE u.isDeleted = false AND u.executorId = :executorId")
    java.util.List<User> findByExecutorId(@Param("executorId") Long executorId);
}
