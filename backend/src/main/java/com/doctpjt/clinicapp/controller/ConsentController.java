package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.Consent;
import com.doctpjt.clinicapp.entity.NotificationType;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.service.ConsentService;
import com.doctpjt.clinicapp.service.NotificationService;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/consent")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class ConsentController {

    private final ConsentService consentService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public ConsentController(ConsentService consentService,
                             NotificationService notificationService,
                             UserRepository userRepository) {
        this.consentService = consentService;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /**
     * POST /api/consent/request
     * Doctor requests consent from a patient.
     * Body: { "patientId": 123 }
     */
    @PostMapping("/request")
    @PreAuthorize("hasRole('DOCTOR')")
    public Consent requestConsent(@RequestBody Map<String, Long> body, Authentication authentication) {
        Long doctorUserId = (Long) authentication.getPrincipal();
        Long patientId = body.get("patientId");
        if (patientId == null) {
            throw new IllegalArgumentException("patientId is required");
        }

        Consent consent = consentService.requestConsent(patientId, doctorUserId);

        // Send notification to patient if a new PENDING consent was created
        if (consent.getStatus().name().equals("PENDING")) {
            String doctorName = userRepository.findById(doctorUserId)
                .map(User::getFullName)
                .orElse("A doctor");
            notificationService.createNotification(
                patientId,
                NotificationType.CONSENT_REQUEST,
                "Consent Request",
                String.format("Dr. %s is requesting access to your medical history.", doctorName)
            );
        }

        return consent;
    }

    /**
     * PUT /api/consent/{id}/approve
     * Patient approves a pending consent request.
     * Body: { "durationHours": 24 }
     */
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('PATIENT')")
    public Consent approveConsent(@PathVariable Long id,
                                  @RequestBody(required = false) Map<String, Integer> body,
                                  Authentication authentication) {
        Long patientId = (Long) authentication.getPrincipal();
        Integer durationHours = (body != null) ? body.get("durationHours") : null;
        return consentService.approveConsent(id, patientId, durationHours);
    }

    /**
     * PUT /api/consent/{id}/deny
     * Patient denies a pending consent request.
     */
    @PutMapping("/{id}/deny")
    @PreAuthorize("hasRole('PATIENT')")
    public Consent denyConsent(@PathVariable Long id, Authentication authentication) {
        Long patientId = (Long) authentication.getPrincipal();
        return consentService.denyConsent(id, patientId);
    }

    /**
     * PUT /api/consent/revoke-all
     * Patient revokes all active/pending consent.
     */
    @PutMapping("/revoke-all")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Object> revokeAll(Authentication authentication) {
        Long patientId = (Long) authentication.getPrincipal();
        int count = consentService.revokeAllForPatient(patientId);
        return Map.of("revoked", count);
    }

    /**
     * GET /api/consent/patient/pending
     * Patient views pending consent requests.
     */
    @GetMapping("/patient/pending")
    @PreAuthorize("hasRole('PATIENT')")
    public List<Consent> getPatientPending(Authentication authentication) {
        Long patientId = (Long) authentication.getPrincipal();
        return consentService.getPendingForPatient(patientId);
    }

    /**
     * GET /api/consent/patient/active
     * Patient views currently active consents.
     */
    @GetMapping("/patient/active")
    @PreAuthorize("hasRole('PATIENT')")
    public List<Consent> getPatientActive(Authentication authentication) {
        Long patientId = (Long) authentication.getPrincipal();
        return consentService.getActiveForPatient(patientId);
    }

    /**
     * GET /api/consent/check/{patientId}
     * Doctor checks if they have active consent for a patient.
     * Returns: { "status": "ACTIVE" | "PENDING" | "NONE" }
     */
    @GetMapping("/check/{patientId}")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    public Map<String, String> checkConsent(@PathVariable Long patientId, Authentication authentication) {
        Long doctorUserId = (Long) authentication.getPrincipal();
        boolean isAdmin = authentication.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) {
            return Map.of("status", "ACTIVE");
        }
        String status = consentService.getConsentStatusForDoctor(doctorUserId, patientId);
        return Map.of("status", status);
    }
}
