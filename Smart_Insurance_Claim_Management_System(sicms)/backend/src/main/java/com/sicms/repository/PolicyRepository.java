package com.sicms.repository;

import com.sicms.model.Policy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PolicyRepository extends JpaRepository<Policy, Long> {
    List<Policy> findByCustomerIdOrderByIdDesc(Long customerId);
    List<Policy> findAllByOrderByIdDesc();
}
