package com.sicms.service;

import com.sicms.dto.Dtos.*;
import com.sicms.exception.ApiException;
import com.sicms.model.Role;
import com.sicms.model.User;
import com.sicms.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public UserService(UserRepository users, PasswordEncoder encoder, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.audit = audit;
    }

    public List<UserDto> all() {
        return users.findAll().stream().map(UserDto::of).toList();
    }

    public List<UserDto> byRole(Role role) {
        return users.findByRoleOrderByFullNameAsc(role).stream().filter(User::isActive).map(UserDto::of).toList();
    }

    @Transactional
    public UserDto create(CreateUserRequest req, User actor) {
        if (users.existsByEmailIgnoreCase(req.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User u = new User();
        u.setFullName(req.fullName().trim());
        u.setEmail(req.email().trim().toLowerCase());
        u.setPhone(req.phone());
        u.setRole(req.role());
        u.setPasswordHash(encoder.encode(req.password()));
        users.save(u);
        audit.log(actor.getEmail(), "USER_CREATED", "USER", u.getId(), u.getEmail() + " as " + u.getRole());
        return UserDto.of(u);
    }

    @Transactional
    public UserDto update(Long id, UpdateUserRequest req, User actor) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        if (u.getId().equals(actor.getId()) && (Boolean.FALSE.equals(req.active())
                || (req.role() != null && req.role() != Role.ADMIN))) {
            throw ApiException.badRequest("You cannot deactivate or demote your own account");
        }
        if (req.role() != null) u.setRole(req.role());
        if (req.active() != null) u.setActive(req.active());
        users.save(u);
        audit.log(actor.getEmail(), "USER_UPDATED", "USER", u.getId(),
                "role=" + u.getRole() + ", active=" + u.isActive());
        return UserDto.of(u);
    }
}
