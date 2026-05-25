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

    public PageResponse<LegalAct> list(UserDetailsImpl currentUser, Long orgId, String search,
                                        int page, int size) {
        Set<Long> visibleOrgs = getVisibleOrgIds(currentUser);
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (orgId != null && visibleOrgs.contains(orgId)) {
            return PageResponse.from(legalActRepository.findByOrganizationIds(Set.of(orgId), pageable));
        }
        if (currentUser.getRole().equals("admin")) {
            return PageResponse.from(legalActRepository.findAllActive(pageable));
        }
        return PageResponse.from(legalActRepository.findByOrganizationIds(visibleOrgs, pageable));
    }

    public LegalAct findById(Long id) {
        return legalActRepository.findById(id)
                .filter(la -> !la.isDeleted())
                .orElseThrow(() -> new AppException("Hüquqi akt tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public LegalAct create(UserDetailsImpl currentUser, Map<String, Object> data) {
        validateUniqueness(null, data);

        LegalAct act = buildFromData(new LegalAct(), data);
        act.setInsertedUserId(currentUser.getId());
        act.setActive(true);
        act = legalActRepository.save(act);

        saveExecutorLinks(act, (List<Map<String, Object>>) data.get("executors"));
        notifyExecutors(act);

        return act;
    }

    @Transactional
    public LegalAct update(Long id, UserDetailsImpl currentUser, Map<String, Object> data) {
        LegalAct act = findById(id);
        validateUniqueness(id, data);

        recordChangelog(act, data, currentUser.getId());
        buildFromData(act, data);
        act = legalActRepository.save(act);

        // Update executor links
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
        if (user.getRole().equals("admin")) return Collections.emptySet(); // empty means "all" for admin
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
        if (data.containsKey("executionDeadline") && data.get("executionDeadline") != null)
            act.setExecutionDeadline(LocalDate.parse((String) data.get("executionDeadline")));
        if (data.containsKey("relatedDocumentNumber"))
            act.setRelatedDocumentNumber((String) data.get("relatedDocumentNumber"));
        if (data.containsKey("relatedDocumentDate") && data.get("relatedDocumentDate") != null)
            act.setRelatedDocumentDate(LocalDate.parse((String) data.get("relatedDocumentDate")));
        return act;
    }

    private void saveExecutorLinks(LegalAct act, List<Map<String, Object>> executors) {
        if (executors == null) return;
        for (Map<String, Object> e : executors) {
            Long executorId = toLong(e.get("executorId"));
            Executor executor = executorRepository.findById(executorId).orElse(null);
            if (executor == null) continue;

            LegalActExecutorLink link = LegalActExecutorLink.builder()
                    .id(new LegalActExecutorId(act.getId(), executorId))
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
        // Simplified: log changed fields
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

    private Long toLong(Object val) {
        if (val == null) return null;
        return Long.valueOf(val.toString());
    }
}
