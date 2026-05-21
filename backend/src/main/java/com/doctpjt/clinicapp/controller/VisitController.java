package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.dto.VisitDtos.VisitCreateRequest;
import com.doctpjt.clinicapp.dto.VisitDtos.VisitResponse;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.service.VisitService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/visits")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class VisitController {

    private final VisitService visitService;
    private final AppointmentRepository appointmentRepository;

    public VisitController(VisitService visitService, AppointmentRepository appointmentRepository) {
        this.visitService = visitService;
        this.appointmentRepository = appointmentRepository;
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
            // Time-based access: only allow if patient has an active appointment TODAY with this doctor
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            LocalDateTime todayEnd = todayStart.plusDays(1);
            List<Appointment> todayAppointments = appointmentRepository.findByDoctorUserIdAndStartTimeBetween(
                doctorUserId, todayStart, todayEnd);
            boolean hasActiveToday = todayAppointments.stream()
                .anyMatch(a -> a.getPatientUserId().equals(patientUserId)
                    && a.getStatus() == AppointmentStatus.BOOKED);
            if (!hasActiveToday) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Patient data is only accessible during active appointments");
            }
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
