package com.dms.service;

import com.dms.entity.Announcement;
import com.dms.exception.AppException;
import com.dms.repository.AnnouncementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;

    public List<Announcement> listAll() { return announcementRepository.findAllByOrderByCreatedAtDesc(); }
    public List<Announcement> listActive() { return announcementRepository.findByIsActiveTrueOrderByCreatedAtDesc(); }

    public Announcement findById(Long id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new AppException("Elan tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Announcement create(Long creatorId, String title, String message) {
        return announcementRepository.save(Announcement.builder()
                .title(title).message(message).isActive(true).createdBy(creatorId).build());
    }

    @Transactional
    public Announcement update(Long id, String title, String message) {
        Announcement a = findById(id);
        a.setTitle(title);
        a.setMessage(message);
        return announcementRepository.save(a);
    }

    @Transactional
    public void delete(Long id) { announcementRepository.deleteById(id); }

    @Transactional
    public Announcement toggle(Long id) {
        Announcement a = findById(id);
        a.setActive(!a.isActive());
        return announcementRepository.save(a);
    }
}
