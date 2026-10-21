package com.sicms.config;

import com.sicms.model.*;
import com.sicms.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** Loads demo users, products, policies and claims on first start-up. All passwords: Password@123 */
@Component
public class DataSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String PASSWORD = "Password@123";

    private final UserRepository users;
    private final ProductRepository products;
    private final PolicyRepository policies;
    private final ClaimRepository claims;
    private final ClaimHistoryRepository history;
    private final AuditLogRepository audit;
    private final PasswordEncoder encoder;

    public DataSeeder(UserRepository users, ProductRepository products, PolicyRepository policies,
                      ClaimRepository claims, ClaimHistoryRepository history, AuditLogRepository audit,
                      PasswordEncoder encoder) {
        this.users = users;
        this.products = products;
        this.policies = policies;
        this.claims = claims;
        this.history = history;
        this.audit = audit;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;

        User admin = user("System Administrator", "admin@sicms.com", Role.ADMIN, "9000000001");
        User officer = user("Ravi Kumar (Claims Officer)", "officer@sicms.com", Role.OFFICER, "9000000002");
        User officer2 = user("Meera Iyer (Claims Officer)", "officer2@sicms.com", Role.OFFICER, "9000000006");
        User agent = user("Anita Sharma (Agent)", "agent@sicms.com", Role.AGENT, "9000000003");
        User cust = user("Priya Reddy", "customer@sicms.com", Role.CUSTOMER, "9000000004");
        User cust2 = user("Arjun Mehta", "customer2@sicms.com", Role.CUSTOMER, "9000000005");

        Product health = product("HLT-GOLD", "Health Gold Plan", "HEALTH", "Family floater health cover with cashless hospitalisation", 1_000_000);
        Product motor = product("MTR-COMP", "Motor Comprehensive", "MOTOR", "Own damage + third party cover for private cars", 1_500_000);
        Product home = product("HOME-SECURE", "Home Secure", "HOME", "Structure and contents cover against fire, theft and natural disasters", 5_000_000);
        Product life = product("LIFE-TERM", "Term Life Protect", "LIFE", "Pure term life cover", 10_000_000);
        product("TRVL-INTL", "Travel International", "TRAVEL", "Overseas medical, baggage and trip-delay cover", 500_000);

        LocalDate today = LocalDate.now();
        Policy p1 = policy(cust, health, 500_000, 12_500, today.minusMonths(10), today.plusMonths(2));
        Policy p2 = policy(cust, motor, 800_000, 18_000, today.minusMonths(6), today.plusMonths(6));
        Policy p3 = policy(cust2, home, 3_000_000, 9_500, today.minusMonths(8), today.plusMonths(4));
        policy(cust2, life, 5_000_000, 22_000, today.minusYears(1), today.plusYears(19));

        LocalDateTime now = LocalDateTime.now();
        claim(p1, cust, cust, null, "HOSPITALISATION", today.minusMonths(5), 85_000,
                ClaimStatus.SETTLED, now.minusMonths(5), "Hospitalised for 3 days due to dengue fever.", officer, 80_000);
        claim(p2, cust, agent, officer, "ACCIDENT", today.minusMonths(3), 120_000,
                ClaimStatus.APPROVED, now.minusMonths(3), "Rear bumper and tail-light damage in a collision.", officer, 110_000);
        claim(p3, cust2, cust2, officer, "THEFT", today.minusMonths(2), 60_000,
                ClaimStatus.REJECTED, now.minusMonths(2), "Laptop and jewellery stolen during break-in.", officer, 0);
        claim(p1, cust, cust, officer, "HOSPITALISATION", today.minusDays(40), 45_000,
                ClaimStatus.UNDER_REVIEW, now.minusDays(35), "Knee surgery - day care procedure.", null, -1);
        claim(p3, cust2, agent, officer2, "FIRE", today.minusDays(20), 250_000,
                ClaimStatus.INFO_REQUESTED, now.minusDays(18), "Kitchen fire damaged cabinets and appliances.", null, -1);
        claim(p2, cust, cust, null, "ACCIDENT", today.minusDays(6), 30_000,
                ClaimStatus.SUBMITTED, now.minusDays(5), "Side mirror broken in parking lot.", null, -1);
        claim(p1, cust, cust, null, "HOSPITALISATION", today.minusDays(2), 15_000,
                ClaimStatus.DRAFT, now.minusDays(1), "OPD consultation and diagnostics (draft).", null, -1);

        audit.save(new AuditLog("system", "DATA_SEEDED", "SYSTEM", null, "Demo data loaded"));
        log.info("Demo data loaded. Log in with admin@sicms.com / officer@sicms.com / agent@sicms.com / customer@sicms.com, password {}", PASSWORD);
    }

    private User user(String name, String email, Role role, String phone) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setRole(role);
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(PASSWORD));
        return users.save(u);
    }

    private Product product(String code, String name, String cat, String desc, long max) {
        Product p = new Product();
        p.setCode(code);
        p.setName(name);
        p.setCategory(cat);
        p.setDescription(desc);
        p.setMaxCoverage(BigDecimal.valueOf(max));
        return products.save(p);
    }

    private Policy policy(User c, Product pr, long sum, long premium, LocalDate start, LocalDate end) {
        Policy p = new Policy();
        p.setCustomer(c);
        p.setProduct(pr);
        p.setSumInsured(BigDecimal.valueOf(sum));
        p.setPremium(BigDecimal.valueOf(premium));
        p.setStartDate(start);
        p.setEndDate(end);
        policies.save(p);
        p.setPolicyNumber(String.format("POL-%d-%05d", start.getYear(), p.getId()));
        return policies.save(p);
    }

    /** Creates a claim and the status history that leads to {@code finalStatus}. */
    private void claim(Policy p, User customer, User filedBy, User assigned, String type, LocalDate incident,
                       long amount, ClaimStatus finalStatus, LocalDateTime created,
                       String desc, User decidedBy, long approved) {
        Claim c = new Claim();
        c.setPolicy(p);
        c.setCustomer(customer);
        c.setFiledBy(filedBy);
        c.setClaimType(type);
        c.setIncidentDate(incident);
        c.setClaimedAmount(BigDecimal.valueOf(amount));
        c.setDescription(desc);
        c.setStatus(ClaimStatus.DRAFT);
        c.setCreatedAt(created);
        claims.save(c);
        c.setClaimNumber(String.format("CLM-%d-%05d", created.getYear(), c.getId()));
        hist(c, null, ClaimStatus.DRAFT, filedBy, "Claim drafted", created);

        User officer = assigned != null ? assigned : decidedBy;
        if (finalStatus != ClaimStatus.DRAFT) {
            c.setSubmittedAt(created.plusHours(1));
            hist(c, ClaimStatus.DRAFT, ClaimStatus.SUBMITTED, filedBy, "Claim submitted", created.plusHours(1));
        }
        if (finalStatus.ordinal() >= ClaimStatus.UNDER_REVIEW.ordinal()) {
            c.setAssignedOfficer(officer);
            hist(c, ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW, officer, "Review started", created.plusDays(1));
        }
        switch (finalStatus) {
            case INFO_REQUESTED -> {
                c.setRemarks("Please upload the fire brigade report and repair estimate.");
                hist(c, ClaimStatus.UNDER_REVIEW, ClaimStatus.INFO_REQUESTED, officer, c.getRemarks(), created.plusDays(2));
            }
            case APPROVED, SETTLED -> {
                c.setApprovedAmount(BigDecimal.valueOf(approved));
                c.setDecidedAt(created.plusDays(4));
                c.setRemarks("Approved for " + approved + " after document verification");
                hist(c, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, officer, c.getRemarks(), created.plusDays(4));
                if (finalStatus == ClaimStatus.SETTLED) {
                    hist(c, ClaimStatus.APPROVED, ClaimStatus.SETTLED, officer, "Payment released to customer bank account", created.plusDays(6));
                }
            }
            case REJECTED -> {
                c.setApprovedAmount(BigDecimal.ZERO);
                c.setDecidedAt(created.plusDays(3));
                c.setRemarks("Police FIR not filed within 48 hours as required by policy terms.");
                hist(c, ClaimStatus.UNDER_REVIEW, ClaimStatus.REJECTED, officer, c.getRemarks(), created.plusDays(3));
            }
            default -> { }
        }
        c.setStatus(finalStatus);
        claims.save(c);
    }

    private void hist(Claim c, ClaimStatus from, ClaimStatus to, User by, String comment, LocalDateTime at) {
        ClaimHistory h = new ClaimHistory(c, from, to, by, comment);
        h.setChangedAt(at);
        history.save(h);
    }
}
