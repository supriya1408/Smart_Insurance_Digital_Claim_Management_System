package com.sicms.service;

import com.sicms.dto.Dtos.*;
import com.sicms.exception.ApiException;
import com.sicms.model.Role;
import com.sicms.model.User;
import com.sicms.repository.UserRepository;
import com.sicms.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
    }

    public AuthResponse login(LoginRequest req) {
        User u = users.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            audit.log(req.email(), "LOGIN_FAILED", "USER", u.getId(), "Wrong password");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if (!u.isActive()) throw new ApiException(HttpStatus.FORBIDDEN, "Your account is deactivated. Contact the administrator.");
        audit.log(u.getEmail(), "LOGIN", "USER", u.getId(), null);
        return new AuthResponse(jwt.generateToken(u), UserDto.of(u));
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (users.existsByEmailIgnoreCase(req.email().trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User u = new User();
        u.setFullName(req.fullName().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setPhone(req.phone());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(Role.CUSTOMER);   // self-registration is always a customer
        users.save(u);
        audit.log(u.getEmail(), "REGISTER", "USER", u.getId(), "Customer self-registration");
        return new AuthResponse(jwt.generateToken(u), UserDto.of(u));
    }
}
