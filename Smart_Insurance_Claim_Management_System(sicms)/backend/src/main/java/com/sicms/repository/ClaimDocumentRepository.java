package com.sicms.repository;

import com.sicms.model.ClaimDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimDocumentRepository extends JpaRepository<ClaimDocument, Long> {
    List<ClaimDocument> findByClaimIdOrderByIdAsc(Long claimId);
    long countByClaimId(Long claimId);
}
