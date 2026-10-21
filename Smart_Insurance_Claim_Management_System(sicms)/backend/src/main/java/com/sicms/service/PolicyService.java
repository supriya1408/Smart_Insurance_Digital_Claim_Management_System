package com.sicms.service;

import com.sicms.dto.Dtos.*;
import com.sicms.exception.ApiException;
import com.sicms.model.*;
import com.sicms.repository.PolicyRepository;
import com.sicms.repository.ProductRepository;
import com.sicms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class PolicyService {
    private final PolicyRepository policies;
    private final ProductRepository products;
    private final UserRepository users;
    private final AuditService audit;

    public PolicyService(PolicyRepository policies, ProductRepository products, UserRepository users, AuditService audit) {
        this.policies = policies;
        this.products = products;
        this.users = users;
        this.audit = audit;
    }

    @Transactional
    public List<PolicyDto> list(User me, Long customerId) {
        refreshExpired();
        if (me.getRole() == Role.CUSTOMER) {
            return policies.findByCustomerIdOrderByIdDesc(me.getId()).stream().map(PolicyDto::of).toList();
        }
        if (customerId != null) {
            return policies.findByCustomerIdOrderByIdDesc(customerId).stream().map(PolicyDto::of).toList();
        }
        return policies.findAllByOrderByIdDesc().stream().map(PolicyDto::of).toList();
    }

    @Transactional
    public PolicyDto issue(PolicyRequest req, User actor) {
        User customer = users.findById(req.customerId()).orElseThrow(() -> ApiException.notFound("Customer"));
        if (customer.getRole() != Role.CUSTOMER) throw ApiException.badRequest("Policies can only be issued to customers");
        Product product = products.findById(req.productId()).orElseThrow(() -> ApiException.notFound("Product"));
        if (!product.isActive()) throw ApiException.badRequest("Product is not active");
        if (product.getMaxCoverage() != null && req.sumInsured().compareTo(product.getMaxCoverage()) > 0) {
            throw ApiException.badRequest("Sum insured exceeds the product's maximum coverage of " + product.getMaxCoverage());
        }
        if (!req.endDate().isAfter(req.startDate())) throw ApiException.badRequest("End date must be after start date");

        Policy p = new Policy();
        p.setCustomer(customer);
        p.setProduct(product);
        p.setSumInsured(req.sumInsured());
        p.setPremium(req.premium());
        p.setStartDate(req.startDate());
        p.setEndDate(req.endDate());
        p.setStatus(req.endDate().isBefore(LocalDate.now()) ? PolicyStatus.EXPIRED : PolicyStatus.ACTIVE);
        policies.save(p);
        p.setPolicyNumber(String.format("POL-%d-%05d", req.startDate().getYear(), p.getId()));
        policies.save(p);
        audit.log(actor.getEmail(), "POLICY_ISSUED", "POLICY", p.getPolicyNumber(),
                product.getName() + " to " + customer.getEmail());
        return PolicyDto.of(p);
    }

    @Transactional
    public PolicyDto cancel(Long id, User actor) {
        Policy p = policies.findById(id).orElseThrow(() -> ApiException.notFound("Policy"));
        p.setStatus(PolicyStatus.CANCELLED);
        policies.save(p);
        audit.log(actor.getEmail(), "POLICY_CANCELLED", "POLICY", p.getPolicyNumber(), null);
        return PolicyDto.of(p);
    }

    private void refreshExpired() {
        LocalDate today = LocalDate.now();
        for (Policy p : policies.findAll()) {
            if (p.getStatus() == PolicyStatus.ACTIVE && p.getEndDate() != null && p.getEndDate().isBefore(today)) {
                p.setStatus(PolicyStatus.EXPIRED);
                policies.save(p);
            }
        }
    }
}
