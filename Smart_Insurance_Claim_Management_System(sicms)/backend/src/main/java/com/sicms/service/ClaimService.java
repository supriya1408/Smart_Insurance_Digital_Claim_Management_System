package com.sicms.service;

import com.sicms.dto.Dtos.*;
import com.sicms.exception.ApiException;
import com.sicms.model.*;
import com.sicms.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Claim lifecycle:
 * DRAFT -> SUBMITTED -> UNDER_REVIEW -> (APPROVED | REJECTED | INFO_REQUESTED)
 * INFO_REQUESTED -> (resubmit) -> UNDER_REVIEW
 * APPROVED -> SETTLED -> CLOSED,   REJECTED -> CLOSED
 */
@Service
public class ClaimService {
    public static final Set<String> CLAIM_TYPES = Set.of(
            "HOSPITALISATION", "ACCIDENT", "THEFT", "FIRE", "NATURAL_DISASTER", "DEATH", "TRAVEL_DELAY", "OTHER");

    private final ClaimRepository claims;
    private final PolicyRepository policies;
    private final UserRepository users;
    private final ClaimDocumentRepository documents;
    private final ClaimHistoryRepository history;
    private final FileStorageService storage;
    private final AuditService audit;

    public ClaimService(ClaimRepository claims, PolicyRepository policies, UserRepository users,
                        ClaimDocumentRepository documents, ClaimHistoryRepository history,
                        FileStorageService storage, AuditService audit) {
        this.claims = claims;
        this.policies = policies;
        this.users = users;
        this.documents = documents;
        this.history = history;
        this.storage = storage;
        this.audit = audit;
    }

    // ------------------------------------------------------------------ queries

    /** Claims visible to the current user, optionally filtered. */
    @Transactional(readOnly = true)
    public List<ClaimSummaryDto> list(User me, String status, String q, boolean mine) {
        List<Claim> base = visibleClaims(me);
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        return base.stream()
                .filter(c -> status == null || status.isBlank() || c.getStatus().name().equalsIgnoreCase(status))
                .filter(c -> !mine || (c.getAssignedOfficer() != null && c.getAssignedOfficer().getId().equals(me.getId())))
                .filter(c -> query.isEmpty()
                        || c.getClaimNumber().toLowerCase().contains(query)
                        || c.getCustomer().getFullName().toLowerCase().contains(query)
                        || c.getPolicy().getPolicyNumber().toLowerCase().contains(query)
                        || c.getClaimType().toLowerCase().contains(query))
                .map(ClaimSummaryDto::of)
                .toList();
    }

    public List<Claim> visibleClaims(User me) {
        return switch (me.getRole()) {
            case CUSTOMER -> claims.findByCustomerIdOrderByIdDesc(me.getId());
            case AGENT -> claims.findByFiledByIdOrderByIdDesc(me.getId());
            case OFFICER -> claims.findByStatusNotOrderByIdDesc(ClaimStatus.DRAFT);
            case ADMIN -> claims.findAllByOrderByIdDesc();
        };
    }

    @Transactional(readOnly = true)
    public ClaimDetailDto detail(Long id, User me) {
        Claim c = load(id);
        assertCanView(c, me);
        return toDetail(c, me);
    }

    // ------------------------------------------------------------------ commands

    @Transactional
    public ClaimDetailDto create(ClaimRequest req, User me) {
        Policy policy = policies.findById(req.policyId()).orElseThrow(() -> ApiException.notFound("Policy"));
        if (me.getRole() == Role.CUSTOMER && !policy.getCustomer().getId().equals(me.getId())) {
            throw ApiException.forbidden("You can only claim against your own policies");
        }
        if (me.getRole() == Role.OFFICER) throw ApiException.forbidden("Claims officers cannot file claims");
        validate(req, policy);

        Claim c = new Claim();
        c.setPolicy(policy);
        c.setCustomer(policy.getCustomer());
        c.setFiledBy(me);
        apply(c, req);
        c.setStatus(ClaimStatus.DRAFT);
        claims.save(c);
        c.setClaimNumber(String.format("CLM-%d-%05d", LocalDate.now().getYear(), c.getId()));
        claims.save(c);
        history.save(new ClaimHistory(c, null, ClaimStatus.DRAFT, me,
                me.getRole() == Role.AGENT ? "Claim drafted by agent on behalf of customer" : "Claim drafted"));
        audit.log(me.getEmail(), "CLAIM_CREATED", "CLAIM", c.getClaimNumber(), c.getClaimType() + " " + c.getClaimedAmount());

        if (Boolean.TRUE.equals(req.submit())) {
            doSubmit(c, me, "Claim submitted");
        }
        return toDetail(c, me);
    }

    @Transactional
    public ClaimDetailDto updateDraft(Long id, ClaimRequest req, User me) {
        Claim c = load(id);
        assertOwnerSide(c, me);
        if (c.getStatus() != ClaimStatus.DRAFT && c.getStatus() != ClaimStatus.INFO_REQUESTED) {
            throw ApiException.badRequest("Only draft or info-requested claims can be edited");
        }
        if (!c.getPolicy().getId().equals(req.policyId())) {
            throw ApiException.badRequest("Policy cannot be changed after the claim is created");
        }
        validate(req, c.getPolicy());
        apply(c, req);
        claims.save(c);
        audit.log(me.getEmail(), "CLAIM_EDITED", "CLAIM", c.getClaimNumber(), null);
        if (Boolean.TRUE.equals(req.submit())) {
            doSubmit(c, me, c.getStatus() == ClaimStatus.INFO_REQUESTED ? "Additional information provided" : "Claim submitted");
        }
        return toDetail(c, me);
    }

    @Transactional
    public ClaimDetailDto submit(Long id, String comment, User me) {
        Claim c = load(id);
        assertOwnerSide(c, me);
        doSubmit(c, me, blank(comment) ? "Claim submitted" : comment);
        return toDetail(c, me);
    }

    @Transactional
    public ClaimDetailDto assign(Long id, Long officerId, User me) {
        Claim c = load(id);
        User officer = users.findById(officerId).orElseThrow(() -> ApiException.notFound("Officer"));
        if (officer.getRole() != Role.OFFICER || !officer.isActive()) throw ApiException.badRequest("Selected user is not an active claims officer");
        if (c.getStatus() == ClaimStatus.DRAFT || isFinal(c.getStatus())) {
            throw ApiException.badRequest("Claim in status " + c.getStatus() + " cannot be assigned");
        }
        c.setAssignedOfficer(officer);
        claims.save(c);
        history.save(new ClaimHistory(c, c.getStatus(), c.getStatus(), me, "Assigned to " + officer.getFullName()));
        audit.log(me.getEmail(), "CLAIM_ASSIGNED", "CLAIM", c.getClaimNumber(), officer.getEmail());
        return toDetail(c, me);
    }

    @Transactional
    public ClaimDetailDto action(Long id, ClaimActionRequest req, User me) {
        Claim c = load(id);
        if (me.getRole() != Role.OFFICER && me.getRole() != Role.ADMIN) {
            throw ApiException.forbidden("Only claims officers or admins can process claims");
        }
        String action = req.action().trim().toUpperCase(Locale.ROOT);
        if (!allowedActions(c, me).contains(action)) {
            throw ApiException.badRequest("Action " + action + " is not allowed while the claim is " + c.getStatus());
        }
        ClaimStatus from = c.getStatus();
        String comment = req.comment();

        switch (action) {
            case "START_REVIEW" -> {
                if (c.getAssignedOfficer() == null && me.getRole() == Role.OFFICER) c.setAssignedOfficer(me);
                c.setStatus(ClaimStatus.UNDER_REVIEW);
                if (blank(comment)) comment = "Review started";
            }
            case "APPROVE" -> {
                BigDecimal amt = req.approvedAmount() == null ? c.getClaimedAmount() : req.approvedAmount();
                if (amt.signum() <= 0) throw ApiException.badRequest("Approved amount must be greater than zero");
                if (amt.compareTo(c.getClaimedAmount()) > 0) throw ApiException.badRequest("Approved amount cannot exceed the claimed amount");
                if (amt.compareTo(c.getPolicy().getSumInsured()) > 0) throw ApiException.badRequest("Approved amount cannot exceed the sum insured");
                c.setApprovedAmount(amt);
                c.setStatus(ClaimStatus.APPROVED);
                c.setDecidedAt(LocalDateTime.now());
                if (blank(comment)) comment = "Approved for " + amt;
            }
            case "REJECT" -> {
                if (blank(comment)) throw ApiException.badRequest("Please give a reason for rejection");
                c.setApprovedAmount(BigDecimal.ZERO);
                c.setStatus(ClaimStatus.REJECTED);
                c.setDecidedAt(LocalDateTime.now());
            }
            case "REQUEST_INFO" -> {
                if (blank(comment)) throw ApiException.badRequest("Please describe the information required");
                c.setStatus(ClaimStatus.INFO_REQUESTED);
            }
            case "SETTLE" -> {
                c.setStatus(ClaimStatus.SETTLED);
                if (blank(comment)) comment = "Payment of " + c.getApprovedAmount() + " released";
            }
            case "CLOSE" -> {
                c.setStatus(ClaimStatus.CLOSED);
                if (blank(comment)) comment = "Claim closed";
            }
            default -> throw ApiException.badRequest("Unknown action " + action);
        }
        if (!blank(comment)) c.setRemarks(comment);
        claims.save(c);
        history.save(new ClaimHistory(c, from, c.getStatus(), me, comment));
        audit.log(me.getEmail(), "CLAIM_" + action, "CLAIM", c.getClaimNumber(), from + " -> " + c.getStatus());
        return toDetail(c, me);
    }

    @Transactional
    public DocumentDto upload(Long claimId, MultipartFile file, String documentType, User me) {
        Claim c = load(claimId);
        assertCanView(c, me);
        if (c.getStatus() == ClaimStatus.CLOSED) throw ApiException.badRequest("Documents cannot be added to a closed claim");
        if (documents.countByClaimId(claimId) >= 20) throw ApiException.badRequest("A claim can have at most 20 documents");
        String key = storage.store(claimId, file);
        ClaimDocument d = new ClaimDocument();
        d.setClaim(c);
        d.setFileName(file.getOriginalFilename());
        d.setContentType(file.getContentType());
        d.setSizeBytes(file.getSize());
        d.setStorageKey(key);
        d.setDocumentType(blank(documentType) ? "SUPPORTING" : documentType.toUpperCase(Locale.ROOT));
        d.setUploadedBy(me);
        documents.save(d);
        audit.log(me.getEmail(), "DOCUMENT_UPLOADED", "CLAIM", c.getClaimNumber(), d.getFileName());
        return DocumentDto.of(d);
    }

    @Transactional(readOnly = true)
    public ClaimDocument documentForDownload(Long docId, User me) {
        ClaimDocument d = documents.findById(docId).orElseThrow(() -> ApiException.notFound("Document"));
        assertCanView(d.getClaim(), me);
        return d;
    }

    // ------------------------------------------------------------------ helpers

    private void doSubmit(Claim c, User me, String comment) {
        ClaimStatus from = c.getStatus();
        if (from != ClaimStatus.DRAFT && from != ClaimStatus.INFO_REQUESTED) {
            throw ApiException.badRequest("Only draft or info-requested claims can be submitted");
        }
        ClaimStatus to = (from == ClaimStatus.INFO_REQUESTED && c.getAssignedOfficer() != null)
                ? ClaimStatus.UNDER_REVIEW : ClaimStatus.SUBMITTED;
        c.setStatus(to);
        if (c.getSubmittedAt() == null) c.setSubmittedAt(LocalDateTime.now());
        claims.save(c);
        history.save(new ClaimHistory(c, from, to, me, comment));
        audit.log(me.getEmail(), "CLAIM_SUBMITTED", "CLAIM", c.getClaimNumber(), from + " -> " + to);
    }

    public List<String> allowedActions(Claim c, User me) {
        List<String> a = new ArrayList<>();
        boolean ownerSide = isOwnerSide(c, me);
        boolean processor = me.getRole() == Role.OFFICER || me.getRole() == Role.ADMIN;
        switch (c.getStatus()) {
            case DRAFT -> { if (ownerSide) { a.add("EDIT"); a.add("SUBMIT"); } }
            case INFO_REQUESTED -> { if (ownerSide) { a.add("EDIT"); a.add("SUBMIT"); } }
            case SUBMITTED -> { if (processor) { a.add("START_REVIEW"); } if (me.getRole() == Role.ADMIN) a.add("ASSIGN"); }
            case UNDER_REVIEW -> {
                boolean canDecide = me.getRole() == Role.ADMIN || c.getAssignedOfficer() == null
                        || c.getAssignedOfficer().getId().equals(me.getId());
                if (processor && canDecide) { a.add("APPROVE"); a.add("REJECT"); a.add("REQUEST_INFO"); }
                if (me.getRole() == Role.ADMIN) a.add("ASSIGN");
            }
            case APPROVED -> { if (processor) a.add("SETTLE"); }
            case REJECTED, SETTLED -> { if (processor) a.add("CLOSE"); }
            case CLOSED -> { }
        }
        if (c.getStatus() != ClaimStatus.CLOSED && canView(c, me)) a.add("UPLOAD");
        return a;
    }

    private ClaimDetailDto toDetail(Claim c, User me) {
        return new ClaimDetailDto(
                ClaimSummaryDto.of(c), PolicyDto.of(c.getPolicy()), c.getDescription(), c.getRemarks(),
                UserDto.of(c.getCustomer()), UserDto.of(c.getFiledBy()), UserDto.of(c.getAssignedOfficer()),
                c.getSubmittedAt(), c.getDecidedAt(),
                documents.findByClaimIdOrderByIdAsc(c.getId()).stream().map(DocumentDto::of).toList(),
                history.findByClaimIdOrderByIdAsc(c.getId()).stream().map(HistoryDto::of).toList(),
                allowedActions(c, me));
    }

    private void validate(ClaimRequest req, Policy policy) {
        if (policy.getStatus() != PolicyStatus.ACTIVE) throw ApiException.badRequest("Policy " + policy.getPolicyNumber() + " is not active");
        String type = req.claimType().trim().toUpperCase(Locale.ROOT);
        if (!CLAIM_TYPES.contains(type)) throw ApiException.badRequest("Unknown claim type " + req.claimType());
        if (req.incidentDate().isAfter(LocalDate.now())) throw ApiException.badRequest("Incident date cannot be in the future");
        if (req.incidentDate().isBefore(policy.getStartDate()) || req.incidentDate().isAfter(policy.getEndDate())) {
            throw ApiException.badRequest("Incident date must fall within the policy period ("
                    + policy.getStartDate() + " to " + policy.getEndDate() + ")");
        }
        if (req.claimedAmount().compareTo(policy.getSumInsured()) > 0) {
            throw ApiException.badRequest("Claimed amount exceeds the sum insured of " + policy.getSumInsured());
        }
    }

    private void apply(Claim c, ClaimRequest req) {
        c.setClaimType(req.claimType().trim().toUpperCase(Locale.ROOT));
        c.setIncidentDate(req.incidentDate());
        c.setDescription(req.description().trim());
        c.setClaimedAmount(req.claimedAmount());
    }

    private Claim load(Long id) {
        return claims.findById(id).orElseThrow(() -> ApiException.notFound("Claim"));
    }

    private boolean isOwnerSide(Claim c, User me) {
        return (me.getRole() == Role.CUSTOMER && c.getCustomer().getId().equals(me.getId()))
                || (me.getRole() == Role.AGENT && c.getFiledBy() != null && c.getFiledBy().getId().equals(me.getId()));
    }

    private void assertOwnerSide(Claim c, User me) {
        if (!isOwnerSide(c, me)) throw ApiException.forbidden("Only the customer or the filing agent can do this");
    }

    private boolean canView(Claim c, User me) {
        return switch (me.getRole()) {
            case ADMIN -> true;
            case OFFICER -> c.getStatus() != ClaimStatus.DRAFT;
            case CUSTOMER, AGENT -> isOwnerSide(c, me);
        };
    }

    private void assertCanView(Claim c, User me) {
        if (!canView(c, me)) throw ApiException.forbidden("You do not have access to this claim");
    }

    private static boolean isFinal(ClaimStatus s) {
        return s == ClaimStatus.SETTLED || s == ClaimStatus.CLOSED || s == ClaimStatus.REJECTED;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
