package com.dms.service;

import com.dms.entity.Department;
import com.dms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DepartmentHierarchyService {

    private final DepartmentRepository departmentRepository;

    // Returns the given dept + all descendant IDs
    public Set<Long> selfAndDescendantIds(Long deptId) {
        List<Department> all = departmentRepository.findAllActive();
        Map<Long, List<Long>> childMap = buildChildMap(all);
        Set<Long> result = new HashSet<>();
        collectDescendants(deptId, childMap, result);
        return result;
    }

    // Returns only descendant IDs (not self)
    public Set<Long> descendantIds(Long deptId) {
        Set<Long> result = selfAndDescendantIds(deptId);
        result.remove(deptId);
        return result;
    }

    // Returns ancestor IDs from deptId up to root
    public List<Long> ancestorIds(Long deptId) {
        List<Department> all = departmentRepository.findAllActive();
        Map<Long, Long> parentMap = new HashMap<>();
        for (Department d : all) {
            if (d.getParentId() != null) parentMap.put(d.getId(), d.getParentId());
        }

        List<Long> ancestors = new ArrayList<>();
        Long current = parentMap.get(deptId);
        while (current != null) {
            ancestors.add(current);
            current = parentMap.get(current);
        }
        return ancestors;
    }

    // Returns the nearest ancestor with can_assign = true
    public Optional<Long> nearestAssignableAncestorId(Long deptId) {
        List<Department> all = departmentRepository.findAllActive();
        Map<Long, Department> deptMap = new HashMap<>();
        for (Department d : all) deptMap.put(d.getId(), d);

        Long current = deptId;
        while (current != null) {
            Department dept = deptMap.get(current);
            if (dept == null) break;
            if (dept.isCanAssign()) return Optional.of(dept.getId());
            current = dept.getParentId();
        }
        return Optional.empty();
    }

    // All assignable departments visible to a manager in a specific department
    public Set<Long> visibleOrgIds(Long managerDeptId) {
        // Manager can see: their own assignable dept subtree + any ancestor assignable depts
        Optional<Long> assignable = nearestAssignableAncestorId(managerDeptId);
        if (assignable.isEmpty()) return selfAndDescendantIds(managerDeptId);
        return selfAndDescendantIds(assignable.get());
    }

    private void collectDescendants(Long deptId, Map<Long, List<Long>> childMap, Set<Long> result) {
        result.add(deptId);
        List<Long> children = childMap.getOrDefault(deptId, Collections.emptyList());
        for (Long child : children) {
            collectDescendants(child, childMap, result);
        }
    }

    private Map<Long, List<Long>> buildChildMap(List<Department> all) {
        Map<Long, List<Long>> map = new HashMap<>();
        for (Department d : all) {
            if (d.getParentId() != null) {
                map.computeIfAbsent(d.getParentId(), k -> new ArrayList<>()).add(d.getId());
            }
        }
        return map;
    }
}
