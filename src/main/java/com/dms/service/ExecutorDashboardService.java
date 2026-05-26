package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.*;
import com.dms.exception.AppException;
import com.dms.repository.*;
import com.dms.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExecutorDashboardService {

    private final LegalActRepository legalActRepository;
    private final ExecutorStatusLogRepository statusLogRepository;
    private final ExecutionAttachmentRepository attachmentRepository;
    private final ExecutionNoteRepository executionNoteRepository;
    private final ExecutorRepository executorRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final DepartmentHierarchyService hierarchyService;

    public PageResponse<LegalAct> listTasks(UserDetailsImpl user, int page, int size, String search) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        String s = (search == null || search.isBlank()) ? "" : search;

        // executor role: show only their own acts
        if (user.getExecutorId() != null) {
            return PageResponse.from(
                legalActRepository.findByExecutorIdsAndSearch(Set.of(user.getExecutorId()), s, pageable));
        }

        // manager/admin: show acts for executors in their visible departments
        Set<Long> visibleDepts;
        if (user.getRole().equals("admin")) {
            visibleDepts = null; // all
        } else if (user.getDepartmentId() != null) {
            visibleDepts = hierarchyService.selfAndDescendantIds(user.getDepartmentId());
        } else {
            throw new AppException("Bu hesab üçün tapşırıq görünüşü mövcud deyil", HttpStatus.FORBIDDEN);
        }

        List<Executor> executors = visibleDepts != null
            ? executorRepository.findByDepartmentIds(visibleDepts)
            : executorRepository.findAllActive();

        if (executors.isEmpty()) {
            return PageResponse.empty();
        }

        Set<Long> executorIds = executors.stream().map(Executor::getId).collect(Collectors.toSet());
        return PageResponse.from(legalActRepository.findByExecutorIdsAndSearch(executorIds, s, pageable));
    }

    public LegalAct getTaskDetail(Long legalActId) {
        return legalActRepository.findById(legalActId)
                .orElseThrow(() -> new AppException("Tapşırıq tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public ExecutorStatusLog submitStatus(Long legalActId, UserDetailsImpl user,
                                          Long executionNoteId, String customNote,
                                          List<MultipartFile> files) {
        LegalAct act = getTaskDetail(legalActId);
        ExecutionNote note = executionNoteRepository.findById(executionNoteId)
                .orElseThrow(() -> new AppException("İcra qeydi tapılmadı", HttpStatus.NOT_FOUND));

        boolean isCompletion = note.getNote().contains("İcra olunub");
        if (isCompletion && act.isProofRequired() && (files == null || files.isEmpty())) {
            throw new AppException("Bu tapşırıq üçün sübut faylı əlavə etmək məcburidir");
        }

        // 60-minute grace period: if a pending icra log exists from this user, replace it
        if (isCompletion) {
            List<ExecutorStatusLog> existing = statusLogRepository.findByLegalActIdOrderByCreatedAtDesc(legalActId);
            for (ExecutorStatusLog prev : existing) {
                if (prev.isPending() && prev.isExecutionComplete()
                        && prev.getUser() != null && prev.getUser().getId().equals(user.getId())) {
                    long minutesElapsed = java.time.Duration.between(prev.getCreatedAt(), LocalDateTime.now()).toMinutes();
                    if (minutesElapsed <= 60) {
                        // delete old attachments and the old log
                        for (ExecutionAttachment att : prev.getAttachments()) {
                            fileStorageService.delete(att.getFilePath());
                            attachmentRepository.delete(att);
                        }
                        statusLogRepository.delete(prev);
                        break;
                    }
                }
            }
        }

        User currentUser = userRepository.findByUsernameAndIsDeletedFalse(user.getUsername())
                .orElseThrow(() -> new AppException("İstifadəçi tapılmadı", HttpStatus.NOT_FOUND));

        ExecutorStatusLog log = ExecutorStatusLog.builder()
                .legalAct(act)
                .user(currentUser)
                .executionNote(note)
                .customNote(customNote)
                .approvalStatus(isCompletion ? ExecutorStatusLog.APPROVAL_PENDING : null)
                .build();

        log = statusLogRepository.save(log);

        if (files != null) {
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String path = fileStorageService.store(file, "execution-attachments/" + legalActId);
                ExecutionAttachment att = ExecutionAttachment.builder()
                        .legalAct(act)
                        .user(currentUser)
                        .statusLog(log)
                        .filePath(path)
                        .originalName(file.getOriginalFilename())
                        .mimeType(file.getContentType())
                        .fileSize(file.getSize())
                        .build();
                attachmentRepository.save(att);
            }
        }

        return log;
    }

    @Transactional
    public void withdrawStatus(Long legalActId, UserDetailsImpl user) {
        // Only withdraw the current user's own pending log
        List<ExecutorStatusLog> logs = statusLogRepository.findByLegalActIdOrderByCreatedAtDesc(legalActId);
        ExecutorStatusLog target = logs.stream()
                .filter(l -> l.isPending()
                        && l.getUser() != null
                        && l.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new AppException("Geri alınacaq gözləmədə olan status tapılmadı"));

        if (!user.getRole().equals("admin")) {
            long minutesElapsed = java.time.Duration.between(target.getCreatedAt(), LocalDateTime.now()).toMinutes();
            if (minutesElapsed > 60) {
                throw new AppException("Statusu yalnız göndərildikdən sonrakı 60 dəqiqə ərzində geri almaq mümkündür");
            }
        }

        for (ExecutionAttachment att : target.getAttachments()) {
            fileStorageService.delete(att.getFilePath());
            attachmentRepository.delete(att);
        }
        statusLogRepository.delete(target);
    }

    public ExecutionAttachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new AppException("Fayl tapılmadı", HttpStatus.NOT_FOUND));
    }

    public java.nio.file.Path resolveFile(ExecutionAttachment att) {
        return fileStorageService.resolve(att.getFilePath());
    }
}
