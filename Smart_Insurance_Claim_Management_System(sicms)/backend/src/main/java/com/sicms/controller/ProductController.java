package com.sicms.controller;

import com.sicms.dto.Dtos.*;
import com.sicms.security.CurrentUser;
import com.sicms.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;
    private final CurrentUser currentUser;

    public ProductController(ProductService productService, CurrentUser currentUser) {
        this.productService = productService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<ProductDto> list() {
        return productService.all();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDto create(@Valid @RequestBody ProductRequest req) {
        return productService.create(req, currentUser.get());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDto update(@PathVariable("id") Long id, @Valid @RequestBody ProductRequest req) {
        return productService.update(id, req, currentUser.get());
    }
}
