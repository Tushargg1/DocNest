package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.dto.VisitDtos.VisitCreateRequest;
import com.doctpjt.clinicapp.dto.VisitDtos.VisitResponse;
import com.doctpjt.clinicapp.service.ConsentService;
import com.doctpjt.clinicapp.service.VisitService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/visits")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class VisitController {

    private final VisitService visitService;
    private final ConsentService consentService;

    public VisitController(VisitService visitService, ConsentService consentService) {
        this.visitService = visitService;
        this.consentService = consentService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (#request.doctorUserId == principal and hasRole('DOCTOR'))")
    public VisitResponse createVisit(@Valid @RequestBody VisitCreateRequest request) {
        return visitService.createVisit(request);
    }

    @GetMapping("/patient/{patientUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#patientUserId == principal and hasRole('PATIENT'))")
    public List<VisitResponse> getPatientVisits(@PathVariable Long patientUserId) {
        return visitService.getPatientVisits(patientUserId);
    }

    @GetMapping("/doctor/{doctorUserId}/patient/{patientUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public List<VisitResponse> getDoctorPatientHistory(
        @PathVariable Long doctorUserId,
        @PathVariable Long patientUserId,
        Authentication authentication
    ) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        if (!admin) {
            consentService.assertActiveConsent(patientUserId, doctorUserId);
        }
        return visitService.getDoctorPatientHistory(doctorUserId, patientUserId);
    }

    /**
     * PATCH /api/visits/{visitId}/prescription
     * Allows the patient (or admin) to attach a prescription photo URL to their visit record.
     * Body: { "prescriptionPhotoUrl": "https://..." }
     */
    @PatchMapping("/{visitId}/prescription")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN', 'DOCTOR')")
    public VisitResponse updatePrescriptionUrl(
        @PathVariable Long visitId,
        @RequestBody Map<String, String> body
    ) {
        String url = body.get("prescriptionPhotoUrl");
        return visitService.updatePrescriptionUrl(visitId, url);
    }
}
