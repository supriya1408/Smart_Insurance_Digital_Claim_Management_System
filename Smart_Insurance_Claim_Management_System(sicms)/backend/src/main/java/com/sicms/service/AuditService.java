package com.sicms.service;

import com.sicms.dto.Dtos.AuditDto;
import com.sicms.model.AuditLog;
import com.sicms.repository.AuditLogRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditService {
    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    public void log(String actor, String action, String entityType, Object entityRef, String details) {
        repo.save(new AuditLog(actor, action, entityType, entityRef == null ? null : String.valueOf(entityRef), details));
    }

    public List<AuditDto> latest(int limit) {
        return repo.findAllByOrderByIdDesc(PageRequest.of(0, Math.max(1, Math.min(limit, 1000))))
                .stream().map(AuditDto::of).toList();
    }
}
