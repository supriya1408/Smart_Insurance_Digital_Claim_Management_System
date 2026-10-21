package com.sicms.repository;

import com.sicms.model.Claim;
import com.sicms.model.ClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClaimRepository extends JpaRepository<Claim, Long> {
    List<Claim> findAllByOrderByIdDesc();
    List<Claim> findByCustomerIdOrderByIdDesc(Long customerId);
    List<Claim> findByFiledByIdOrderByIdDesc(Long userId);
    List<Claim> findByStatusNotOrderByIdDesc(ClaimStatus status);
}
