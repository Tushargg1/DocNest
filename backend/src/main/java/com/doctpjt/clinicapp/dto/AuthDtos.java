package com.doctpjt.clinicapp.dto;

import com.doctpjt.clinicapp.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 100)
        String fullName,

        String email,

        @NotBlank(message = "Phone number is required")
        String phoneNumber,

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        String password,

        @NotNull(message = "Role is required")
        Role role,

        Double latitude,
        Double longitude
    ) {}

    public record LoginRequest(
        @NotBlank(message = "Phone number or email is required")
        String identifier,

        @NotBlank(message = "Password is required")
        String password
    ) {}

    public record AuthResponse(Long userId, String fullName, String email, String phoneNumber, Role role, String token) {}
}
