package com.sicms.repository;

import com.sicms.model.ClaimHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimHistoryRepository extends JpaRepository<ClaimHistory, Long> {
    List<ClaimHistory> findByClaimIdOrderByIdAsc(Long claimId);
}
