package com.dms.service;

import com.dms.entity.*;
import com.dms.repository.*;
import com.dms.security.UserDetailsImpl;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ExecutorRepository executorRepository;
    private final LegalActRepository legalActRepository;
    private final ExecutorStatusLogRepository statusLogRepository;
    private final ExecutionNoteRepository executionNoteRepository;
    private final DepartmentHierarchyService hierarchyService;

    @Data
    public static class ExecutorStat {
        private Long executorId;
        private String executorName;
        private String departmentName;
        private long total;
        private long executed;
        private long pendingApproval;
        private long rejected;
        private long inProgress;
        private long notStarted;
        private long overdue;
        private double executionRate;
    }

    public List<ExecutorStat> generateReport(UserDetailsImpl user, Long deptId) {
        Set<Long> visibleDepts;
        if (user.getRole().equals("admin")) {
            if (deptId != null) {
                visibleDepts = hierarchyService.selfAndDescendantIds(deptId);
            } else {
                visibleDepts = null; // all
            }
        } else {
            visibleDepts = hierarchyService.visibleOrgIds(
                    user.getDepartmentId() != null ? user.getDepartmentId() : 0L);
            if (deptId != null && visibleDepts.contains(deptId)) {
                visibleDepts = hierarchyService.selfAndDescendantIds(deptId);
            }
        }

        List<Executor> executors = visibleDepts != null
                ? executorRepository.findByDepartmentIds(visibleDepts)
                : executorRepository.findAllActive();

        List<Long> icraIds = executionNoteRepository.findIcraOlunubIds();
        LocalDate today = LocalDate.now();

        List<ExecutorStat> stats = new ArrayList<>();
        for (Executor executor : executors) {
            ExecutorStat stat = new ExecutorStat();
            stat.setExecutorId(executor.getId());
            stat.setExecutorName(executor.getName());
            stat.setDepartmentName(executor.getDepartment() != null ? executor.getDepartment().getName() : "");

            // Get all legal acts for this executor
            var page = legalActRepository.findByExecutorIds(
                    Set.of(executor.getId()),
                    org.springframework.data.domain.PageRequest.of(0, 10000));
            List<LegalAct> acts = page.getContent();
            stat.setTotal(acts.size());

            long executed = 0, pendingApproval = 0, rejected = 0, overdue = 0, notStarted = 0;

            for (LegalAct act : acts) {
                List<ExecutorStatusLog> logs = statusLogRepository
                        .findByLegalActIdOrderByCreatedAtDesc(act.getId());

                if (logs.isEmpty()) {
                    notStarted++;
                } else {
                    ExecutorStatusLog latest = logs.get(0);
                    boolean isIcra = latest.getExecutionNote() != null &&
                                     icraIds.contains(latest.getExecutionNote().getId());

                    if (isIcra && latest.isApproved()) executed++;
                    else if (isIcra && latest.isPending()) pendingApproval++;
                    else if (isIcra && latest.isRejected()) rejected++;
                }

                if (act.getExecutionDeadline() != null && act.getExecutionDeadline().isBefore(today)) {
                    List<ExecutorStatusLog> actLogs = logs;
                    boolean isExecuted = !actLogs.isEmpty() &&
                            actLogs.get(0).getExecutionNote() != null &&
                            icraIds.contains(actLogs.get(0).getExecutionNote().getId()) &&
                            actLogs.get(0).isApproved();
                    if (!isExecuted) overdue++;
                }
            }

            long inProgress = acts.size() - executed - pendingApproval - rejected - notStarted;
            if (inProgress < 0) inProgress = 0;

            stat.setExecuted(executed);
            stat.setPendingApproval(pendingApproval);
            stat.setRejected(rejected);
            stat.setInProgress(inProgress);
            stat.setNotStarted(notStarted);
            stat.setOverdue(overdue);
            stat.setExecutionRate(acts.isEmpty() ? 0 : Math.round((double) executed / acts.size() * 100.0));

            stats.add(stat);
        }
        return stats;
    }

    public byte[] exportExcel(UserDetailsImpl user, Long deptId) {
        List<ExecutorStat> stats = generateReport(user, deptId);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Hesabat");
            String[] headers = {"İcraçı", "Şöbə", "Ümumi", "İcra olunub", "Gözləmədə",
                                 "Rədd edilib", "Davam edir", "Başlanmayıb", "Vaxtı keçmiş", "İcra faizi %"};
            Row hRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) hRow.createCell(i).setCellValue(headers[i]);

            int rowNum = 1;
            for (ExecutorStat s : stats) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(s.getExecutorName());
                row.createCell(1).setCellValue(s.getDepartmentName());
                row.createCell(2).setCellValue(s.getTotal());
                row.createCell(3).setCellValue(s.getExecuted());
                row.createCell(4).setCellValue(s.getPendingApproval());
                row.createCell(5).setCellValue(s.getRejected());
                row.createCell(6).setCellValue(s.getInProgress());
                row.createCell(7).setCellValue(s.getNotStarted());
                row.createCell(8).setCellValue(s.getOverdue());
                row.createCell(9).setCellValue(s.getExecutionRate());
            }
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Export xətası", e);
        }
    }
}
