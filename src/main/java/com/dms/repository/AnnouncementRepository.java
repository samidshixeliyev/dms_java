package com.dms.repository;

import com.dms.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    List<Announcement> findByIsActiveTrueOrderByCreatedAtDesc();

    List<Announcement> findAllByOrderByCreatedAtDesc();
}
