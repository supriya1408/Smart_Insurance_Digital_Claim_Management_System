package com.sicms.controller;

import com.sicms.dto.Dtos.*;
import com.sicms.model.ClaimDocument;
import com.sicms.security.CurrentUser;
import com.sicms.service.ClaimService;
import com.sicms.service.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@RestController
@RequestMapping("/api")
public class ClaimController {
    private final ClaimService claimService;
    private final FileStorageService storage;
    private final CurrentUser currentUser;

    public ClaimController(ClaimService claimService, FileStorageService storage, CurrentUser currentUser) {
        this.claimService = claimService;
        this.storage = storage;
        this.currentUser = currentUser;
    }

    @GetMapping("/claims")
    public List<ClaimSummaryDto> list(@RequestParam(value = "status", required = false) String status,
                                      @RequestParam(value = "q", required = false) String q,
                                      @RequestParam(value = "mine", defaultValue = "false") boolean mine) {
        return claimService.list(currentUser.get(), status, q, mine);
    }

    @GetMapping("/claims/types")
    public List<String> types() {
        return List.copyOf(new TreeSet<>(ClaimService.CLAIM_TYPES));
    }

    @GetMapping("/claims/{id}")
    public ClaimDetailDto get(@PathVariable("id") Long id) {
        return claimService.detail(id, currentUser.get());
    }

    @PostMapping("/claims")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT')")
    public ClaimDetailDto create(@Valid @RequestBody ClaimRequest req) {
        return claimService.create(req, currentUser.get());
    }

    @PutMapping("/claims/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT')")
    public ClaimDetailDto update(@PathVariable("id") Long id, @Valid @RequestBody ClaimRequest req) {
        return claimService.updateDraft(id, req, currentUser.get());
    }

    @PostMapping("/claims/{id}/submit")
    @PreAuthorize("hasAnyRole('CUSTOMER','AGENT')")
    public ClaimDetailDto submit(@PathVariable("id") Long id, @RequestBody(required = false) Map<String, String> body) {
        return claimService.submit(id, body == null ? null : body.get("comment"), currentUser.get());
    }

    @PostMapping("/claims/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ClaimDetailDto assign(@PathVariable("id") Long id, @Valid @RequestBody AssignRequest req) {
        return claimService.assign(id, req.officerId(), currentUser.get());
    }

    /** START_REVIEW, APPROVE, REJECT, REQUEST_INFO, SETTLE, CLOSE */
    @PostMapping("/claims/{id}/actions")
    @PreAuthorize("hasAnyRole('OFFICER','ADMIN')")
    public ClaimDetailDto action(@PathVariable("id") Long id, @Valid @RequestBody ClaimActionRequest req) {
        return claimService.action(id, req, currentUser.get());
    }

    @PostMapping(value = "/claims/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentDto upload(@PathVariable("id") Long id,
                              @RequestParam("file") MultipartFile file,
                              @RequestParam(value = "documentType", required = false) String documentType) {
        return claimService.upload(id, file, documentType, currentUser.get());
    }

    @GetMapping("/documents/{docId}/download")
    public ResponseEntity<Resource> download(@PathVariable("docId") Long docId) {
        ClaimDocument d = claimService.documentForDownload(docId, currentUser.get());
        Resource r = storage.load(d.getStorageKey());
        MediaType type;
        try {
            type = d.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(d.getContentType());
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(d.getFileName(), StandardCharsets.UTF_8).build().toString())
                .body(r);
    }
}
