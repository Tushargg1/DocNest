package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(origins = "*")
public class PatientController {

    private final PatientProfileRepository patientProfileRepository;

    public PatientController(PatientProfileRepository patientProfileRepository) {
        this.patientProfileRepository = patientProfileRepository;
    }

    @GetMapping("/profile/{userId}")
    public PatientProfile getProfile(@PathVariable Long userId) {
        return patientProfileRepository.findByUserId(userId)
            .orElseGet(() -> {
                // Return an empty profile shell so frontend can populate it
                PatientProfile empty = new PatientProfile();
                empty.setUserId(userId);
                return empty;
            });
    }

    @PutMapping("/profile/{userId}")
    public Map<String, Object> updateProfile(@PathVariable Long userId, @RequestBody Map<String, Object> request) {
        PatientProfile profile = patientProfileRepository.findFirstByUserId(userId)
            .orElse(new PatientProfile());
        
        profile.setUserId(userId);
        if (request.get("age") != null && !request.get("age").toString().isEmpty()) {
            profile.setAge(Integer.parseInt(request.get("age").toString()));
        }
        profile.setGender((String) request.get("gender"));
        if (request.get("height") != null && !request.get("height").toString().isEmpty()) {
            profile.setHeight(Double.parseDouble(request.get("height").toString()));
        }
        if (request.get("weight") != null && !request.get("weight").toString().isEmpty()) {
            profile.setWeight(Double.parseDouble(request.get("weight").toString()));
        }
        profile.setBloodGroup((String) request.get("bloodGroup"));
        profile.setAllergies((String) request.get("allergies"));
        profile.setEmergencyContact((String) request.get("emergencyContact"));
        profile.setMedicalHistory((String) request.get("medicalHistory"));
        profile.setAbhaId((String) request.get("abhaId"));
        
        patientProfileRepository.save(profile);
        return request;
    }
}