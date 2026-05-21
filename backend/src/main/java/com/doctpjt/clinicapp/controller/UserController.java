package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        System.out.println("Fetching user with ID: " + id);
        try {
            return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String incomingEmail = request.getEmail() == null ? null : request.getEmail().trim().toLowerCase();
        if (incomingEmail != null && !incomingEmail.isEmpty()) {
            userRepository.findByEmail(incomingEmail)
                .filter(found -> !found.getId().equals(user.getId()))
                .ifPresent(found -> {
                    throw new IllegalArgumentException("Email already in use");
                });
            user.setEmail(incomingEmail);
        } else {
            user.setEmail(null);
        }

        String incomingPhone = request.getPhoneNumber() == null ? null : request.getPhoneNumber().trim();
        if (incomingPhone == null || incomingPhone.isEmpty()) {
            throw new IllegalArgumentException("Phone number is required");
        }
        userRepository.findByPhoneNumber(incomingPhone)
            .filter(found -> !found.getId().equals(user.getId()))
            .ifPresent(found -> {
                throw new IllegalArgumentException("Phone number already in use");
            });
        
        user.setFullName(request.getFullName());
        user.setPhoneNumber(incomingPhone);
        user.setLatitude(request.getLatitude());
        user.setLongitude(request.getLongitude());
        
        return userRepository.save(user);
    }
}
