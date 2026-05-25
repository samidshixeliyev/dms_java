package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.*;
import com.dms.exception.AppException;
import com.dms.repository.*;
import com.dms.security.UserDetailsImpl;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LegalActService {

    private final LegalActRepository legalActRepository;
    private final LegalActChangelogRepository changelogRepository;
    private final ExecutorRepository executorRepository;
    private final DepartmentHierarchyService hierarchyService;
    private final EmailService emailService;
    private final UserRepository userRepository;

    public PageResponse<LegalAct> list(UserDetailsImpl user, Long orgId, String search,
                                        Long actTypeId, Long issuedById, Long executorId,
                                        String deadlineStatus, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Specification<LegalAct> spec = buildSpec(user, orgId, search, actTypeId, issuedById, executorId, deadlineStatus);
        return PageResponse.from(legalActRepository.findAll(spec, pageable));
    }

    public LegalAct findById(Long id) {
        return legalActRepository.findById(id)
                .orElseThrow(() -> new AppException("Hüquqi akt tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public LegalAct create(UserDetailsImpl user, Map<String, Object> data) {
        validateUniqueness(null, data);

        LegalAct act = buildFromData(new LegalAct(), data);
        act.setInsertedUserId(user.getId());
        // auto-set organizationId from user's department if not provided
        if (act.getOrganizationId() == null && user.getDepartmentId() != null) {
            act.setOrganizationId(user.getDepartmentId());
        }
        act = legalActRepository.save(act);

        saveExecutorLinks(act, (List<Map<String, Object>>) data.get("executors"));
        notifyExecutors(act);

        return act;
    }

    @Transactional
    public LegalAct update(Long id, UserDetailsImpl user, Map<String, Object> data) {
        LegalAct act = findById(id);
        validateUniqueness(id, data);

        recordChangelog(act, data, user.getId());
        buildFromData(act, data);
        act = legalActRepository.save(act);

        act.getExecutorLinks().clear();
        legalActRepository.save(act);
        saveExecutorLinks(act, (List<Map<String, Object>>) data.get("executors"));

        return act;
    }

    @Transactional
    public void delete(Long id) {
        LegalAct act = findById(id);
        act.setDeleted(true);
        legalActRepository.save(act);
    }

    @Transactional
    public LegalAct toggleProof(Long id) {
        LegalAct act = findById(id);
        act.setProofRequired(!act.isProofRequired());
        return legalActRepository.save(act);
    }

    public Set<Long> getVisibleOrgIds(UserDetailsImpl user) {
        if (user.getRole().equals("admin")) return Collections.emptySet();
        if (user.getDepartmentId() != null) {
            return hierarchyService.visibleOrgIds(user.getDepartmentId());
        }
        if (user.getExecutorId() != null) {
            Executor exec = executorRepository.findById(user.getExecutorId()).orElse(null);
            if (exec != null && exec.getDepartmentId() != null) {
                return hierarchyService.selfAndDescendantIds(exec.getDepartmentId());
            }
        }
        return Collections.emptySet();
    }

    private Specification<LegalAct> buildSpec(UserDetailsImpl user, Long orgId, String search,
                                               Long actTypeId, Long issuedById, Long executorId,
                                               String deadlineStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // visibility scope
            if (orgId != null) {
                predicates.add(cb.equal(root.get("organizationId"), orgId));
            } else if (!user.getRole().equals("admin")) {
                Set<Long> visibleOrgs = getVisibleOrgIds(user);
                if (!visibleOrgs.isEmpty()) {
                    predicates.add(root.get("organizationId").in(visibleOrgs));
                }
            }

            if (search != null && !search.isBlank()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("legalActNumber")), like),
                    cb.like(cb.lower(root.get("summary")), like),
                    cb.like(cb.lower(root.get("taskNumber")), like)
                ));
            }

            if (actTypeId != null) predicates.add(cb.equal(root.get("actTypeId"), actTypeId));
            if (issuedById != null) predicates.add(cb.equal(root.get("issuedById"), issuedById));

            if (executorId != null) {
                Subquery<Long> sub = query.subquery(Long.class);
                Root<LegalActExecutorLink> linkRoot = sub.from(LegalActExecutorLink.class);
                sub.select(linkRoot.get("legalActId"))
                   .where(cb.equal(linkRoot.get("executorId"), executorId));
                predicates.add(root.get("id").in(sub));
            }

            LocalDate today = LocalDate.now();
            if ("overdue".equals(deadlineStatus)) {
                predicates.add(cb.isNotNull(root.get("executionDeadline")));
                predicates.add(cb.lessThan(root.get("executionDeadline"), today));
            } else if ("due_soon".equals(deadlineStatus)) {
                predicates.add(cb.isNotNull(root.get("executionDeadline")));
                predicates.add(cb.between(root.get("executionDeadline"), today, today.plusDays(7)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private LegalAct buildFromData(LegalAct act, Map<String, Object> data) {
        if (data.containsKey("organizationId"))
            act.setOrganizationId(toLong(data.get("organizationId")));
        if (data.containsKey("actTypeId"))
            act.setActTypeId(toLong(data.get("actTypeId")));
        if (data.containsKey("issuedById"))
            act.setIssuedById(toLong(data.get("issuedById")));
        if (data.containsKey("legalActNumber"))
            act.setLegalActNumber((String) data.get("legalActNumber"));
        if (data.containsKey("legalActDate"))
            act.setLegalActDate(LocalDate.parse((String) data.get("legalActDate")));
        if (data.containsKey("summary"))
            act.setSummary((String) data.get("summary"));
        if (data.containsKey("taskNumber"))
            act.setTaskNumber((String) data.get("taskNumber"));
        if (data.containsKey("taskDescription"))
            act.setTaskDescription((String) data.get("taskDescription"));
        if (data.containsKey("executionDeadline") && data.get("executionDeadline") != null
                && !data.get("executionDeadline").toString().isBlank())
            act.setExecutionDeadline(LocalDate.parse((String) data.get("executionDeadline")));
        else if (data.containsKey("executionDeadline"))
            act.setExecutionDeadline(null);
        if (data.containsKey("relatedDocumentNumber"))
            act.setRelatedDocumentNumber((String) data.get("relatedDocumentNumber"));
        if (data.containsKey("relatedDocumentDate") && data.get("relatedDocumentDate") != null
                && !data.get("relatedDocumentDate").toString().isBlank())
            act.setRelatedDocumentDate(LocalDate.parse((String) data.get("relatedDocumentDate")));
        else if (data.containsKey("relatedDocumentDate"))
            act.setRelatedDocumentDate(null);
        return act;
    }

    private void saveExecutorLinks(LegalAct act, List<Map<String, Object>> executors) {
        if (executors == null) return;
        for (Map<String, Object> e : executors) {
            Long executorId = toLong(e.get("executorId"));
            Executor executor = executorRepository.findById(executorId).orElse(null);
            if (executor == null) continue;

            LegalActExecutorLink link = LegalActExecutorLink.builder()
                    .legalActId(act.getId())
                    .executorId(executorId)
                    .legalAct(act)
                    .executor(executor)
                    .role((String) e.getOrDefault("role", "main"))
                    .taskDescription((String) e.get("taskDescription"))
                    .build();
            act.getExecutorLinks().add(link);
        }
        legalActRepository.save(act);
    }

    private void validateUniqueness(Long excludeId, Map<String, Object> data) {
        Long actTypeId = toLong(data.get("actTypeId"));
        String number = (String) data.get("legalActNumber");
        String dateStr = (String) data.get("legalActDate");
        if (actTypeId == null || number == null || dateStr == null) return;

        int year = LocalDate.parse(dateStr).getYear();
        if (legalActRepository.existsByActTypeNumberYear(actTypeId, number, year, excludeId)) {
            throw new AppException("Bu il üçün eyni növ və nömrəli hüquqi akt artıq mövcuddur");
        }
    }

    private void recordChangelog(LegalAct existing, Map<String, Object> data, Long userId) {
        Map<String, String> labels = Map.of(
                "legalActNumber", "Nömrə",
                "legalActDate", "Tarix",
                "summary", "Xülasə",
                "executionDeadline", "İcra müddəti"
        );
        for (Map.Entry<String, String> entry : labels.entrySet()) {
            if (data.containsKey(entry.getKey())) {
                String newVal = data.get(entry.getKey()) != null ? data.get(entry.getKey()).toString() : "";
                changelogRepository.save(LegalActChangelog.builder()
                        .legalAct(existing)
                        .userId(userId)
                        .fieldKey(entry.getKey())
                        .fieldLabel(entry.getValue())
                        .newValue(newVal)
                        .build());
            }
        }
    }

    private void notifyExecutors(LegalAct act) {
        List<String> emails = act.getExecutorLinks().stream()
                .map(link -> userRepository.findByExecutorId(link.getExecutor().getId()))
                .flatMap(List::stream)
                .map(u -> u.getEmail())
                .filter(e -> e != null && !e.isBlank())
                .toList();
        emailService.sendTaskAssigned(act, emails);
    }

    public byte[] exportExcel(UserDetailsImpl user, Long orgId, String search,
                               Long actTypeId, Long issuedById, Long executorId, String deadlineStatus) {
        Specification<LegalAct> spec = buildSpec(user, orgId, search, actTypeId, issuedById, executorId, deadlineStatus);
        List<LegalAct> acts = legalActRepository.findAll(spec, Sort.by("createdAt").descending());

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Hüquqi Aktlar");
            String[] headers = {"Nömrə", "Tarix", "Növ", "Göndərən", "Şöbə", "Son tarix", "Status"};
            Row hRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) hRow.createCell(i).setCellValue(headers[i]);

            int rowNum = 1;
            for (LegalAct a : acts) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(a.getLegalActNumber() != null ? a.getLegalActNumber() : "");
                row.createCell(1).setCellValue(a.getLegalActDate() != null ? a.getLegalActDate().toString() : "");
                row.createCell(2).setCellValue(a.getActType() != null ? a.getActType().getName() : "");
                row.createCell(3).setCellValue(a.getIssuedBy() != null ? a.getIssuedBy().getName() : "");
                row.createCell(4).setCellValue(a.getOrganization() != null ? a.getOrganization().getName() : "");
                row.createCell(5).setCellValue(a.getExecutionDeadline() != null ? a.getExecutionDeadline().toString() : "");
                ExecutorStatusLog latest = a.getStatusLogs().isEmpty() ? null : a.getStatusLogs().get(0);
                String status = latest == null ? "Başlanmayıb" :
                    "approved".equals(latest.getApprovalStatus()) ? "İcra olunub" :
                    "pending".equals(latest.getApprovalStatus()) ? "Gözləmədə" :
                    "rejected".equals(latest.getApprovalStatus()) ? "Rədd edilib" : "Davam edir";
                row.createCell(6).setCellValue(status);
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Export xətası", e);
        }
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        return Long.valueOf(val.toString());
    }
}
