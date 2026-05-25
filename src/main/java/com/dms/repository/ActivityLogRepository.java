package com.dms.repository;

import com.dms.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("SELECT l FROM ActivityLog l WHERE " +
           "(:search IS NULL OR LOWER(l.description) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<ActivityLog> searchAll(@Param("search") String search, Pageable pageable);
}
