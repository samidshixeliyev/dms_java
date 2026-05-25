package com.dms.service;

import com.dms.entity.ActivityLog;
import com.dms.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Async
    public void log(Long userId, String action, String description, String subjectType, Long subjectId, String ip) {
        activityLogRepository.save(ActivityLog.of(userId, action, description, subjectType, subjectId, ip));
    }

    @Async
    public void log(Long userId, String action, String description, String ip) {
        log(userId, action, description, null, null, ip);
    }
}
