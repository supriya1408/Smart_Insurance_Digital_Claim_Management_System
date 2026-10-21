package com.sicms.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    /** HEALTH, MOTOR, LIFE, HOME, TRAVEL */
    @Column(nullable = false, length = 30)
    private String category;

    @Column(length = 500)
    private String description;

    @Column(precision = 15, scale = 2)
    private BigDecimal maxCoverage;

    private boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getMaxCoverage() { return maxCoverage; }
    public void setMaxCoverage(BigDecimal maxCoverage) { this.maxCoverage = maxCoverage; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
