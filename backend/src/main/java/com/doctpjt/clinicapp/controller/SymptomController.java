package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.service.SymptomCheckerService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/symptoms")
public class SymptomController {

    private final SymptomCheckerService symptomCheckerService;

    public SymptomController(SymptomCheckerService symptomCheckerService) {
        this.symptomCheckerService = symptomCheckerService;
    }

    @PostMapping("/check")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public Map<String, Object> checkSymptoms(@RequestBody Map<String, String> request, Authentication authentication) {
        String symptoms = request.get("symptoms");
        if (symptoms == null || symptoms.isBlank()) {
            throw new IllegalArgumentException("Please describe your symptoms");
        }
        Long patientUserId = (Long) authentication.getPrincipal();
        return symptomCheckerService.checkSymptoms(patientUserId, symptoms);
    }
}
