package com.dms.controller;

import com.dms.dto.ApiResponse;
import com.dms.dto.PageResponse;
import com.dms.entity.*;
import com.dms.service.MasterDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataService masterDataService;

    // --- ACT TYPES ---
    @GetMapping("/act-types")
    public ResponseEntity<ApiResponse<List<ActType>>> listActTypes() {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.listActTypes()));
    }
    @GetMapping("/act-types/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ActType>>> pageActTypes(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.pageActTypes(search, page, size)));
    }
    @GetMapping("/act-types/{id}")
    public ResponseEntity<ApiResponse<ActType>> getActType(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.findActType(id)));
    }
    @PostMapping("/act-types")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActType>> createActType(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Akt növü yaradıldı", masterDataService.saveActType(null, body.get("name"))));
    }
    @PutMapping("/act-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActType>> updateActType(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Akt növü yeniləndi", masterDataService.saveActType(id, body.get("name"))));
    }
    @DeleteMapping("/act-types/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteActType(@PathVariable Long id) {
        masterDataService.deleteActType(id);
        return ResponseEntity.ok(ApiResponse.ok("Akt növü silindi"));
    }

    // --- ISSUING AUTHORITIES ---
    @GetMapping("/issuing-authorities")
    public ResponseEntity<ApiResponse<List<IssuingAuthority>>> listAuthorities() {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.listAuthorities()));
    }
    @GetMapping("/issuing-authorities/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<IssuingAuthority>>> pageAuthorities(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.pageAuthorities(search, page, size)));
    }
    @GetMapping("/issuing-authorities/{id}")
    public ResponseEntity<ApiResponse<IssuingAuthority>> getAuthority(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.findAuthority(id)));
    }
    @PostMapping("/issuing-authorities")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IssuingAuthority>> createAuthority(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Göndərən qurum yaradıldı", masterDataService.saveAuthority(null, body.get("name"))));
    }
    @PutMapping("/issuing-authorities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IssuingAuthority>> updateAuthority(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("Göndərən qurum yeniləndi", masterDataService.saveAuthority(id, body.get("name"))));
    }
    @DeleteMapping("/issuing-authorities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAuthority(@PathVariable Long id) {
        masterDataService.deleteAuthority(id);
        return ResponseEntity.ok(ApiResponse.ok("Göndərən qurum silindi"));
    }

    // --- EXECUTION NOTES ---
    @GetMapping("/execution-notes")
    public ResponseEntity<ApiResponse<List<ExecutionNote>>> listNotes() {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.listNotes()));
    }
    @GetMapping("/execution-notes/page")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ExecutionNote>>> pageNotes(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.pageNotes(search, page, size)));
    }
    @GetMapping("/execution-notes/{id}")
    public ResponseEntity<ApiResponse<ExecutionNote>> getNote(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(masterDataService.findNote(id)));
    }
    @PostMapping("/execution-notes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExecutionNote>> createNote(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("İcra qeydi yaradıldı", masterDataService.saveNote(null, body.get("note"))));
    }
    @PutMapping("/execution-notes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExecutionNote>> updateNote(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok("İcra qeydi yeniləndi", masterDataService.saveNote(id, body.get("note"))));
    }
    @DeleteMapping("/execution-notes/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteNote(@PathVariable Long id) {
        masterDataService.deleteNote(id);
        return ResponseEntity.ok(ApiResponse.ok("İcra qeydi silindi"));
    }
}
