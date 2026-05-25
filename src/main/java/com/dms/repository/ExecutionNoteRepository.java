package com.dms.repository;

import com.dms.entity.ExecutionNote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ExecutionNoteRepository extends JpaRepository<ExecutionNote, Long> {

    @Query("SELECT n FROM ExecutionNote n WHERE n.isDeleted = false ORDER BY n.note")
    List<ExecutionNote> findAllActive();

    @Query("SELECT n FROM ExecutionNote n WHERE n.isDeleted = false AND " +
           "(:search IS NULL OR LOWER(n.note) LIKE LOWER(CONCAT('%',:search,'%')))")
    Page<ExecutionNote> searchActive(@Param("search") String search, Pageable pageable);

    @Query("SELECT n.id FROM ExecutionNote n WHERE n.isDeleted = false AND n.note LIKE '%İcra olunub%'")
    List<Long> findIcraOlunubIds();
}
