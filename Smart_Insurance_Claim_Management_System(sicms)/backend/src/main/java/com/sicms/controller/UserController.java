package com.sicms.controller;

import com.sicms.dto.Dtos.*;
import com.sicms.model.Role;
import com.sicms.security.CurrentUser;
import com.sicms.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final CurrentUser currentUser;

    public UserController(UserService userService, CurrentUser currentUser) {
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> all() {
        return userService.all();
    }

    /** Customers list - used by agents/admins when filing claims or issuing policies. */
    @GetMapping("/customers")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN','OFFICER')")
    public List<UserDto> customers() {
        return userService.byRole(Role.CUSTOMER);
    }

    @GetMapping("/officers")
    @PreAuthorize("hasAnyRole('ADMIN','OFFICER')")
    public List<UserDto> officers() {
        return userService.byRole(Role.OFFICER);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto create(@Valid @RequestBody CreateUserRequest req) {
        return userService.create(req, currentUser.get());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto update(@PathVariable("id") Long id, @RequestBody UpdateUserRequest req) {
        return userService.update(id, req, currentUser.get());
    }
}
