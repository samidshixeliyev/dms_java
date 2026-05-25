package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.Executor;
import com.dms.exception.AppException;
import com.dms.repository.ExecutorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExecutorService {

    private final ExecutorRepository executorRepository;

    public List<Executor> listAll() { return executorRepository.findAllActive(); }

    public PageResponse<Executor> page(String search, int page, int size) {
        return PageResponse.from(executorRepository.searchActive(search,
                PageRequest.of(page, size, Sort.by("name"))));
    }

    public Executor findById(Long id) {
        return executorRepository.findById(id)
                .filter(e -> !e.isDeleted())
                .orElseThrow(() -> new AppException("İcraçı tapılmadı", HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Executor save(Long id, String name, String position, Long departmentId) {
        Executor exec = id != null ? findById(id) : new Executor();
        exec.setName(name);
        exec.setPosition(position);
        exec.setDepartmentId(departmentId);
        return executorRepository.save(exec);
    }

    @Transactional
    public void delete(Long id) {
        Executor exec = findById(id);
        exec.setDeleted(true);
        executorRepository.save(exec);
    }
}
