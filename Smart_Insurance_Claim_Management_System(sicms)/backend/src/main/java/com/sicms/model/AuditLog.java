package com.sicms.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 150)
    private String actor;

    @Column(length = 60)
    private String action;

    @Column(length = 40)
    private String entityType;

    private String entityRef;

    @Column(length = 1000)
    private String details;

    private LocalDateTime timestamp = LocalDateTime.now();

    public AuditLog() { }

    public AuditLog(String actor, String action, String entityType, String entityRef, String details) {
        this.actor = actor;
        this.action = action;
        this.entityType = entityType;
        this.entityRef = entityRef;
        this.details = details;
    }

    public Long getId() { return id; }
    public String getActor() { return actor; }
    public String getAction() { return action; }
    public String getEntityType() { return entityType; }
    public String getEntityRef() { return entityRef; }
    public String getDetails() { return details; }
    public LocalDateTime getTimestamp() { return timestamp; }
}
