package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.service.HealthIntakeService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/intake")
public class IntakeController {

    private final HealthIntakeService healthIntakeService;

    public IntakeController(HealthIntakeService healthIntakeService) {
        this.healthIntakeService = healthIntakeService;
    }

    @PostMapping("/start")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> startIntake(Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        return healthIntakeService.startIntake(patientUserId);
    }

    @PostMapping("/answer")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> submitAnswer(
        @RequestBody Map<String, Object> answer,
        Authentication authentication
    ) {
        Long patientUserId = (Long) authentication.getPrincipal();
        return healthIntakeService.submitAnswer(patientUserId, answer);
    }

    @PostMapping("/complete")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> completeIntake(Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        return healthIntakeService.completeIntake(patientUserId);
    }
}
