package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.Department;
import com.dms.exception.AppException;
import com.dms.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public List<Department> listAll() {
        return departmentRepository.findAllActive();
    }

    public PageResponse<Department> page(String search, int page, int size) {
        return PageResponse.from(departmentRepository.searchActive(search,
                PageRequest.of(page, size, Sort.by("name"))));
    }

    public Department findById(Long id) {
        return departmentRepository.findById(id)
                .filter(d -> !d.isDeleted())
                .orElseThrow(() -> new AppException("Şöbə tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Department save(Long id, String name, Long parentId, boolean canAssign) {
        Department dept = id != null ? findById(id) : new Department();

        if (parentId != null && parentId.equals(id)) {
            throw new AppException("Şöbə özünü ana şöbə kimi seçə bilməz");
        }

        dept.setName(name);
        dept.setParentId(parentId);
        dept.setCanAssign(canAssign);
        return departmentRepository.save(dept);
    }

    @Transactional
    public void delete(Long id) {
        Department dept = findById(id);
        dept.setDeleted(true);
        departmentRepository.save(dept);
    }
}
