package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.AuthDtos.AuthResponse;
import com.doctpjt.clinicapp.dto.AuthDtos.LoginRequest;
import com.doctpjt.clinicapp.dto.AuthDtos.RegisterRequest;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.doctpjt.clinicapp.security.JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, com.doctpjt.clinicapp.security.JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String normalizedPhone = request.phoneNumber() == null ? null : request.phoneNumber().trim();
        if (normalizedPhone == null || normalizedPhone.isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }

        if (userRepository.findByPhoneNumber(normalizedPhone).isPresent()) {
            throw new IllegalArgumentException("Phone number already registered");
        }

        String normalizedEmail = request.email() == null ? null : request.email().trim().toLowerCase();
        if (normalizedEmail != null && !normalizedEmail.isEmpty() && !normalizedEmail.contains("@")) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (normalizedEmail != null && !normalizedEmail.isEmpty() && userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(normalizedEmail == null || normalizedEmail.isEmpty() ? null : normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        user.setLatitude(request.latitude());
        user.setLongitude(request.longitude());
        user.setPhoneNumber(normalizedPhone);

        User saved = userRepository.save(user);
        return new AuthResponse(saved.getId(), saved.getFullName(), saved.getEmail(), saved.getPhoneNumber(), saved.getRole(), jwtService.generateToken(saved));
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier() == null ? "" : request.identifier().trim();
        User user;
        if (identifier.contains("@")) {
            user = userRepository.findByEmail(identifier.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        } else {
            user = userRepository.findByPhoneNumber(identifier)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        return new AuthResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhoneNumber(), user.getRole(), jwtService.generateToken(user));
    }
}
