package com.sicms.service;

import com.sicms.dto.Dtos.ReportSummary;
import com.sicms.model.Claim;
import com.sicms.model.ClaimStatus;
import com.sicms.model.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.YearMonth;
import java.util.*;

@Service
public class ReportService {
    private final ClaimService claimService;

    public ReportService(ClaimService claimService) {
        this.claimService = claimService;
    }

    /** Summary scoped to what the current user can see (customer = own claims, admin = everything). */
    @Transactional(readOnly = true)
    public ReportSummary summary(User me) {
        List<Claim> list = claimService.visibleClaims(me);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (ClaimStatus s : ClaimStatus.values()) byStatus.put(s.name(), 0L);
        Map<String, Long> byType = new TreeMap<>();
        Map<String, Long> byProduct = new TreeMap<>();
        Map<String, Long> byMonth = new LinkedHashMap<>();
        YearMonth now = YearMonth.now();
        for (int i = 5; i >= 0; i--) byMonth.put(now.minusMonths(i).toString(), 0L);

        BigDecimal claimed = BigDecimal.ZERO;
        BigDecimal approved = BigDecimal.ZERO;
        long approvedCount = 0, decidedCount = 0, open = 0;
        double decisionDaysTotal = 0;

        for (Claim c : list) {
            byStatus.merge(c.getStatus().name(), 1L, Long::sum);
            byType.merge(c.getClaimType(), 1L, Long::sum);
            byProduct.merge(c.getPolicy().getProduct().getName(), 1L, Long::sum);
            String ym = YearMonth.from(c.getCreatedAt()).toString();
            if (byMonth.containsKey(ym)) byMonth.merge(ym, 1L, Long::sum);

            claimed = claimed.add(c.getClaimedAmount());
            if (c.getApprovedAmount() != null) approved = approved.add(c.getApprovedAmount());

            switch (c.getStatus()) {
                case APPROVED, SETTLED -> { approvedCount++; decidedCount++; }
                case REJECTED -> decidedCount++;
                case CLOSED -> { decidedCount++; if (c.getApprovedAmount() != null && c.getApprovedAmount().signum() > 0) approvedCount++; }
                default -> { if (c.getStatus() != ClaimStatus.DRAFT) open++; }
            }
            if (c.getDecidedAt() != null && c.getSubmittedAt() != null) {
                decisionDaysTotal += Duration.between(c.getSubmittedAt(), c.getDecidedAt()).toHours() / 24.0;
            }
        }
        long withDecision = list.stream().filter(c -> c.getDecidedAt() != null && c.getSubmittedAt() != null).count();
        double approvalRate = decidedCount == 0 ? 0 : Math.round(approvedCount * 1000.0 / decidedCount) / 10.0;
        double avgDays = withDecision == 0 ? 0 : Math.round(decisionDaysTotal * 10.0 / withDecision) / 10.0;

        return new ReportSummary(list.size(), open, claimed, approved, approvalRate, avgDays,
                byStatus, byType, byMonth, byProduct);
    }

    @Transactional(readOnly = true)
    public String claimsCsv(User me) {
        StringBuilder sb = new StringBuilder(
                "Claim Number,Policy Number,Product,Customer,Claim Type,Incident Date,Claimed Amount,Approved Amount,Status,Assigned Officer,Created At\n");
        for (Claim c : claimService.visibleClaims(me)) {
            sb.append(csv(c.getClaimNumber())).append(',')
              .append(csv(c.getPolicy().getPolicyNumber())).append(',')
              .append(csv(c.getPolicy().getProduct().getName())).append(',')
              .append(csv(c.getCustomer().getFullName())).append(',')
              .append(csv(c.getClaimType())).append(',')
              .append(c.getIncidentDate()).append(',')
              .append(c.getClaimedAmount()).append(',')
              .append(c.getApprovedAmount() == null ? "" : c.getApprovedAmount()).append(',')
              .append(c.getStatus()).append(',')
              .append(csv(c.getAssignedOfficer() == null ? "" : c.getAssignedOfficer().getFullName())).append(',')
              .append(c.getCreatedAt()).append('\n');
        }
        return sb.toString();
    }

    private static String csv(String v) {
        if (v == null) return "";
        return (v.contains(",") || v.contains("\"") || v.contains("\n")) ? "\"" + v.replace("\"", "\"\"") + "\"" : v;
    }
}
