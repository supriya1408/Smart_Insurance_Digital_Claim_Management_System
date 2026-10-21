package com.sicms.controller;

import com.sicms.dto.Dtos.*;
import com.sicms.security.CurrentUser;
import com.sicms.service.PolicyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/policies")
public class PolicyController {
    private final PolicyService policyService;
    private final CurrentUser currentUser;

    public PolicyController(PolicyService policyService, CurrentUser currentUser) {
        this.policyService = policyService;
        this.currentUser = currentUser;
    }

    /** Customers get their own policies; staff can filter by customerId. */
    @GetMapping
    public List<PolicyDto> list(@RequestParam(value = "customerId", required = false) Long customerId) {
        return policyService.list(currentUser.get(), customerId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','AGENT')")
    public PolicyDto issue(@Valid @RequestBody PolicyRequest req) {
        return policyService.issue(req, currentUser.get());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public PolicyDto cancel(@PathVariable("id") Long id) {
        return policyService.cancel(id, currentUser.get());
    }
}
