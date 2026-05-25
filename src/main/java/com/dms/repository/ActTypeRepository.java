package com.dms.repository;

import com.dms.entity.ActType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActTypeRepository extends JpaRepository<ActType, Long> {

    @Query("SELECT a FROM ActType a WHERE a.isDeleted = false ORDER BY a.name")
    List<ActType> findAllActive();

    @Query("SELECT a FROM ActType a WHERE a.isDeleted = false AND " +
           "(:search IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<ActType> searchActive(@Param("search") String search, Pageable pageable);
}
