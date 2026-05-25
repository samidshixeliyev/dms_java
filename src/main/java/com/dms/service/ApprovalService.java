package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.ExecutorStatusLog;
import com.dms.exception.AppException;
import com.dms.repository.ExecutorStatusLogRepository;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ApprovalService {

    private final ExecutorStatusLogRepository statusLogRepository;
    private final DepartmentHierarchyService hierarchyService;

    public PageResponse<ExecutorStatusLog> listPending(UserDetailsImpl user, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (user.getRole().equals("admin")) {
            return PageResponse.from(statusLogRepository.findAllPendingApprovals(pageable));
        }
        Set<Long> orgIds = hierarchyService.visibleOrgIds(user.getDepartmentId() != null ? user.getDepartmentId() : 0L);
        return PageResponse.from(statusLogRepository.findPendingApprovals(orgIds, pageable));
    }

    public long countPending(UserDetailsImpl user) {
        if (user.getRole().equals("admin")) {
            return statusLogRepository.findAllPendingApprovals(PageRequest.of(0, 1)).getTotalElements();
        }
        Set<Long> orgIds = hierarchyService.visibleOrgIds(user.getDepartmentId() != null ? user.getDepartmentId() : 0L);
        return statusLogRepository.countPendingApprovals(orgIds);
    }

    @Transactional
    public ExecutorStatusLog approve(Long statusLogId, UserDetailsImpl approver, String note) {
        ExecutorStatusLog log = findById(statusLogId);
        if (!log.isPending()) throw new AppException("Bu status artıq işlənib");

        log.setApprovalStatus(ExecutorStatusLog.APPROVAL_APPROVED);
        log.setApprovedBy(approver.getId());
        log.setApprovalNote(note);
        log.setApprovedAt(LocalDateTime.now());
        return statusLogRepository.save(log);
    }

    @Transactional
    public ExecutorStatusLog reject(Long statusLogId, UserDetailsImpl approver, String note) {
        if (note == null || note.isBlank()) throw new AppException("Rədd etmə səbəbi daxil edilməlidir");

        ExecutorStatusLog log = findById(statusLogId);
        if (!log.isPending()) throw new AppException("Bu status artıq işlənib");

        log.setApprovalStatus(ExecutorStatusLog.APPROVAL_REJECTED);
        log.setApprovedBy(approver.getId());
        log.setApprovalNote(note);
        log.setApprovedAt(LocalDateTime.now());
        return statusLogRepository.save(log);
    }

    private ExecutorStatusLog findById(Long id) {
        return statusLogRepository.findById(id)
                .orElseThrow(() -> new AppException("Status tapılmadı", HttpStatus.NOT_FOUND));
    }
}
