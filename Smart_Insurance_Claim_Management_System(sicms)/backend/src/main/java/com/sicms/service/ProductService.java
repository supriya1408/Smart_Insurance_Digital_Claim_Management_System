package com.sicms.service;

import com.sicms.dto.Dtos.*;
import com.sicms.exception.ApiException;
import com.sicms.model.Product;
import com.sicms.model.User;
import com.sicms.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class ProductService {
    private final ProductRepository products;
    private final AuditService audit;

    public ProductService(ProductRepository products, AuditService audit) {
        this.products = products;
        this.audit = audit;
    }

    public List<ProductDto> all() {
        return products.findAll().stream().sorted(Comparator.comparing(Product::getId)).map(ProductDto::of).toList();
    }

    @Transactional
    public ProductDto create(ProductRequest req, User actor) {
        if (products.existsByCodeIgnoreCase(req.code())) {
            throw new ApiException(HttpStatus.CONFLICT, "Product code already exists");
        }
        Product p = new Product();
        apply(p, req);
        products.save(p);
        audit.log(actor.getEmail(), "PRODUCT_CREATED", "PRODUCT", p.getCode(), p.getName());
        return ProductDto.of(p);
    }

    @Transactional
    public ProductDto update(Long id, ProductRequest req, User actor) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
        if (!p.getCode().equalsIgnoreCase(req.code()) && products.existsByCodeIgnoreCase(req.code())) {
            throw new ApiException(HttpStatus.CONFLICT, "Product code already exists");
        }
        apply(p, req);
        products.save(p);
        audit.log(actor.getEmail(), "PRODUCT_UPDATED", "PRODUCT", p.getCode(), "active=" + p.isActive());
        return ProductDto.of(p);
    }

    private void apply(Product p, ProductRequest req) {
        p.setCode(req.code().trim().toUpperCase());
        p.setName(req.name().trim());
        p.setCategory(req.category().trim().toUpperCase());
        p.setDescription(req.description());
        p.setMaxCoverage(req.maxCoverage());
        p.setActive(req.active() == null || req.active());
    }
}
