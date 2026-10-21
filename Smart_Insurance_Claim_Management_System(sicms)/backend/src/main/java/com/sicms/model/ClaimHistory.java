package com.sicms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim_history")
public class ClaimHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "claim_id")
    private Claim claim;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ClaimStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ClaimStatus toStatus;

    @ManyToOne
    @JoinColumn(name = "changed_by_id")
    private User changedBy;

    @Column(length = 1000)
    private String comment;

    private LocalDateTime changedAt = LocalDateTime.now();

    public ClaimHistory() { }

    public ClaimHistory(Claim claim, ClaimStatus from, ClaimStatus to, User by, String comment) {
        this.claim = claim;
        this.fromStatus = from;
        this.toStatus = to;
        this.changedBy = by;
        this.comment = comment;
    }

    public Long getId() { return id; }
    public Claim getClaim() { return claim; }
    public ClaimStatus getFromStatus() { return fromStatus; }
    public ClaimStatus getToStatus() { return toStatus; }
    public User getChangedBy() { return changedBy; }
    public String getComment() { return comment; }
    public LocalDateTime getChangedAt() { return changedAt; }
    public void setChangedAt(LocalDateTime changedAt) { this.changedAt = changedAt; }
}
