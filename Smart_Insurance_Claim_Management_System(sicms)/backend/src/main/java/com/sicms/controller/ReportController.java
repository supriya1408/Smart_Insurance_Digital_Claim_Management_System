package com.sicms.controller;

import com.sicms.dto.Dtos.*;
import com.sicms.security.CurrentUser;
import com.sicms.service.AuditService;
import com.sicms.service.ReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ReportController {
    private final ReportService reportService;
    private final AuditService auditService;
    private final CurrentUser currentUser;

    public ReportController(ReportService reportService, AuditService auditService, CurrentUser currentUser) {
        this.reportService = reportService;
        this.auditService = auditService;
        this.currentUser = currentUser;
    }

    /** Dashboard numbers - automatically scoped to the caller's role. */
    @GetMapping("/reports/summary")
    public ReportSummary summary() {
        return reportService.summary(currentUser.get());
    }

    @GetMapping("/reports/claims.csv")
    @PreAuthorize("hasAnyRole('ADMIN','OFFICER')")
    public ResponseEntity<byte[]> csv() {
        byte[] body = reportService.claimsCsv(currentUser.get()).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=claims-report-" + LocalDate.now() + ".csv")
                .body(body);
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditDto> audit(@RequestParam(value = "limit", defaultValue = "200") int limit) {
        return auditService.latest(limit);
    }
}
