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

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ExecutorDashboardService {

    private final LegalActRepository legalActRepository;
    private final ExecutorStatusLogRepository statusLogRepository;
    private final ExecutionAttachmentRepository attachmentRepository;
    private final ExecutionNoteRepository executionNoteRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final DepartmentHierarchyService hierarchyService;

    public PageResponse<LegalAct> listTasks(UserDetailsImpl user, int page, int size) {
        if (user.getExecutorId() == null) {
            throw new AppException("Bu hesab icraçıya bağlı deyil", HttpStatus.FORBIDDEN);
        }
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return PageResponse.from(
                legalActRepository.findByExecutorIds(Set.of(user.getExecutorId()), pageable));
    }

    public LegalAct getTaskDetail(Long legalActId) {
        return legalActRepository.findById(legalActId)
                .filter(la -> !la.isDeleted())
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
                String path = fileStorageService.store(file, "legal-acts/" + legalActId);
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
        List<ExecutorStatusLog> logs = statusLogRepository.findByLegalActIdOrderByCreatedAtDesc(legalActId);
        if (logs.isEmpty()) throw new AppException("Heç bir status tapılmadı");

        ExecutorStatusLog latest = logs.get(0);
        if (!latest.isPending()) {
            throw new AppException("Yalnız gözləmədə olan statusu geri almaq olar");
        }
        // Delete attachments first
        for (ExecutionAttachment att : latest.getAttachments()) {
            fileStorageService.delete(att.getFilePath());
            attachmentRepository.delete(att);
        }
        statusLogRepository.delete(latest);
    }

    public ExecutionAttachment getAttachment(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new AppException("Fayl tapılmadı", HttpStatus.NOT_FOUND));
    }

    public java.nio.file.Path resolveFile(ExecutionAttachment att) {
        return fileStorageService.resolve(att.getFilePath());
    }
}
