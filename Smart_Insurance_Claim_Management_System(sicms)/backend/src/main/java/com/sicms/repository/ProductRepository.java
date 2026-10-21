package com.sicms.repository;

import com.sicms.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {
    boolean existsByCodeIgnoreCase(String code);
}
