package com.dms.service;

import com.dms.dto.PageResponse;
import com.dms.entity.*;
import com.dms.exception.AppException;
import com.dms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MasterDataService {

    private final ActTypeRepository actTypeRepository;
    private final IssuingAuthorityRepository issuingAuthorityRepository;
    private final ExecutionNoteRepository executionNoteRepository;

    // --- Act Types ---
    public List<ActType> listActTypes() { return actTypeRepository.findAllActive(); }
    public PageResponse<ActType> pageActTypes(String search, int page, int size) {
        return PageResponse.from(actTypeRepository.searchActive(search,
                PageRequest.of(page, size, Sort.by("name"))));
    }
    public ActType findActType(Long id) {
        return actTypeRepository.findById(id).filter(a -> !a.isDeleted())
                .orElseThrow(() -> new AppException("Tapılmadı", HttpStatus.NOT_FOUND));
    }
    @Transactional
    public ActType saveActType(Long id, String name) {
        ActType e = id != null ? findActType(id) : new ActType();
        e.setName(name);
        return actTypeRepository.save(e);
    }
    @Transactional
    public void deleteActType(Long id) {
        ActType e = findActType(id);
        e.setDeleted(true);
        actTypeRepository.save(e);
    }

    // --- Issuing Authorities ---
    public List<IssuingAuthority> listAuthorities() { return issuingAuthorityRepository.findAllActive(); }
    public PageResponse<IssuingAuthority> pageAuthorities(String search, int page, int size) {
        return PageResponse.from(issuingAuthorityRepository.searchActive(search,
                PageRequest.of(page, size, Sort.by("name"))));
    }
    public IssuingAuthority findAuthority(Long id) {
        return issuingAuthorityRepository.findById(id).filter(a -> !a.isDeleted())
                .orElseThrow(() -> new AppException("Tapılmadı", HttpStatus.NOT_FOUND));
    }
    @Transactional
    public IssuingAuthority saveAuthority(Long id, String name) {
        IssuingAuthority e = id != null ? findAuthority(id) : new IssuingAuthority();
        e.setName(name);
        return issuingAuthorityRepository.save(e);
    }
    @Transactional
    public void deleteAuthority(Long id) {
        IssuingAuthority e = findAuthority(id);
        e.setDeleted(true);
        issuingAuthorityRepository.save(e);
    }

    // --- Execution Notes ---
    public List<ExecutionNote> listNotes() { return executionNoteRepository.findAllActive(); }
    public PageResponse<ExecutionNote> pageNotes(String search, int page, int size) {
        return PageResponse.from(executionNoteRepository.searchActive(search,
                PageRequest.of(page, size, Sort.by("note"))));
    }
    public ExecutionNote findNote(Long id) {
        return executionNoteRepository.findById(id).filter(n -> !n.isDeleted())
                .orElseThrow(() -> new AppException("Tapılmadı", HttpStatus.NOT_FOUND));
    }
    @Transactional
    public ExecutionNote saveNote(Long id, String note) {
        ExecutionNote e = id != null ? findNote(id) : new ExecutionNote();
        e.setNote(note);
        return executionNoteRepository.save(e);
    }
    @Transactional
    public void deleteNote(Long id) {
        ExecutionNote e = findNote(id);
        e.setDeleted(true);
        executionNoteRepository.save(e);
    }
}
