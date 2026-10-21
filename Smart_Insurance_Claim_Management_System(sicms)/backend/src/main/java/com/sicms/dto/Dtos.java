package com.sicms.dto;

import com.sicms.model.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** All request / response payloads used by the REST API. */
public final class Dtos {
    private Dtos() { }

    // ---------------- Auth ----------------
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) { }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
            @Pattern(regexp = "^$|^[0-9+\\- ]{7,20}$", message = "Invalid phone number") String phone) { }

    public record AuthResponse(String token, UserDto user) { }

    // ---------------- Users ----------------
    public record UserDto(Long id, String fullName, String email, String phone, Role role,
                          boolean active, LocalDateTime createdAt) {
        public static UserDto of(User u) {
            if (u == null) return null;
            return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole(),
                    u.isActive(), u.getCreatedAt());
        }
    }

    public record CreateUserRequest(
            @NotBlank String fullName,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8) String password,
            String phone,
            @NotNull Role role) { }

    public record UpdateUserRequest(Role role, Boolean active) { }

    // ---------------- Products ----------------
    public record ProductDto(Long id, String code, String name, String category, String description,
                             BigDecimal maxCoverage, boolean active) {
        public static ProductDto of(Product p) {
            return new ProductDto(p.getId(), p.getCode(), p.getName(), p.getCategory(), p.getDescription(),
                    p.getMaxCoverage(), p.isActive());
        }
    }

    public record ProductRequest(
            @NotBlank @Size(max = 30) String code,
            @NotBlank String name,
            @NotBlank String category,
            String description,
            @NotNull @Positive BigDecimal maxCoverage,
            Boolean active) { }

    // ---------------- Policies ----------------
    public record PolicyDto(Long id, String policyNumber, Long customerId, String customerName,
                            Long productId, String productName, String category,
                            BigDecimal sumInsured, BigDecimal premium,
                            LocalDate startDate, LocalDate endDate, PolicyStatus status) {
        public static PolicyDto of(Policy p) {
            return new PolicyDto(p.getId(), p.getPolicyNumber(), p.getCustomer().getId(),
                    p.getCustomer().getFullName(), p.getProduct().getId(), p.getProduct().getName(),
                    p.getProduct().getCategory(), p.getSumInsured(), p.getPremium(),
                    p.getStartDate(), p.getEndDate(), p.getStatus());
        }
    }

    public record PolicyRequest(
            @NotNull Long customerId,
            @NotNull Long productId,
            @NotNull @Positive BigDecimal sumInsured,
            @NotNull @PositiveOrZero BigDecimal premium,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate) { }

    // ---------------- Claims ----------------
    public record ClaimRequest(
            @NotNull Long policyId,
            @NotBlank String claimType,
            @NotNull @PastOrPresent LocalDate incidentDate,
            @NotBlank @Size(max = 2000) String description,
            @NotNull @Positive BigDecimal claimedAmount,
            Boolean submit) { }

    public record ClaimSummaryDto(Long id, String claimNumber, String policyNumber, String productName,
                                  String customerName, String claimType, LocalDate incidentDate,
                                  BigDecimal claimedAmount, BigDecimal approvedAmount, ClaimStatus status,
                                  String assignedOfficer, LocalDateTime createdAt, LocalDateTime updatedAt) {
        public static ClaimSummaryDto of(Claim c) {
            return new ClaimSummaryDto(c.getId(), c.getClaimNumber(), c.getPolicy().getPolicyNumber(),
                    c.getPolicy().getProduct().getName(), c.getCustomer().getFullName(), c.getClaimType(),
                    c.getIncidentDate(), c.getClaimedAmount(), c.getApprovedAmount(), c.getStatus(),
                    c.getAssignedOfficer() == null ? null : c.getAssignedOfficer().getFullName(),
                    c.getCreatedAt(), c.getUpdatedAt());
        }
    }

    public record DocumentDto(Long id, String fileName, String contentType, long sizeBytes, String documentType,
                              String uploadedBy, LocalDateTime uploadedAt) {
        public static DocumentDto of(ClaimDocument d) {
            return new DocumentDto(d.getId(), d.getFileName(), d.getContentType(), d.getSizeBytes(),
                    d.getDocumentType(), d.getUploadedBy() == null ? null : d.getUploadedBy().getFullName(),
                    d.getUploadedAt());
        }
    }

    public record HistoryDto(Long id, ClaimStatus fromStatus, ClaimStatus toStatus, String changedBy,
                             String comment, LocalDateTime changedAt) {
        public static HistoryDto of(ClaimHistory h) {
            return new HistoryDto(h.getId(), h.getFromStatus(), h.getToStatus(),
                    h.getChangedBy() == null ? "System" : h.getChangedBy().getFullName(),
                    h.getComment(), h.getChangedAt());
        }
    }

    public record ClaimDetailDto(ClaimSummaryDto summary, PolicyDto policy, String description, String remarks,
                                 UserDto customer, UserDto filedBy, UserDto assignedOfficer,
                                 LocalDateTime submittedAt, LocalDateTime decidedAt,
                                 List<DocumentDto> documents, List<HistoryDto> history,
                                 List<String> allowedActions) { }

    public record ClaimActionRequest(
            @NotBlank String action,          // START_REVIEW, APPROVE, REJECT, REQUEST_INFO, SETTLE, CLOSE
            BigDecimal approvedAmount,
            @Size(max = 1000) String comment) { }

    public record AssignRequest(@NotNull Long officerId) { }

    // ---------------- Reports / Audit ----------------
    public record ReportSummary(long totalClaims, long openClaims, BigDecimal totalClaimed, BigDecimal totalApproved,
                                double approvalRatePercent, double avgDecisionDays,
                                Map<String, Long> byStatus, Map<String, Long> byType,
                                Map<String, Long> byMonth, Map<String, Long> byProduct) { }

    public record AuditDto(Long id, String actor, String action, String entityType, String entityRef,
                           String details, LocalDateTime timestamp) {
        public static AuditDto of(AuditLog a) {
            return new AuditDto(a.getId(), a.getActor(), a.getAction(), a.getEntityType(), a.getEntityRef(),
                    a.getDetails(), a.getTimestamp());
        }
    }

    public record MessageResponse(String message) { }
}
