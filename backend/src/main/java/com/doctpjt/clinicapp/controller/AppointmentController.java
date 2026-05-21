package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.AvailableSlotsResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.BookAppointmentRequest;
import com.doctpjt.clinicapp.dto.AppointmentDtos.RescheduleRequest;
import com.doctpjt.clinicapp.dto.AppointmentDtos.ReviewRequest;
import com.doctpjt.clinicapp.service.AppointmentService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping("/doctor/{doctorUserId}/slots")
    public AvailableSlotsResponse getAvailableSlots(
        @PathVariable Long doctorUserId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return appointmentService.getAvailableSlots(doctorUserId, date);
    }

    @PostMapping("/book")
    @PreAuthorize("hasRole('ADMIN') or (#request.patientUserId == principal and hasRole('PATIENT'))")
    public AppointmentResponse book(@Valid @RequestBody BookAppointmentRequest request) {
        return appointmentService.book(request);
    }

    @GetMapping("/patient/{patientUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#patientUserId == principal and hasRole('PATIENT'))")
    public List<AppointmentResponse> getPatientAppointments(@PathVariable Long patientUserId) {
        return appointmentService.getPatientAppointments(patientUserId);
    }

    @GetMapping("/doctor/{doctorUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public List<AppointmentResponse> getDoctorAppointments(
        @PathVariable Long doctorUserId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return appointmentService.getDoctorAppointments(doctorUserId, date);
    }

    @PatchMapping("/{appointmentId}/cancel")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public AppointmentResponse cancelAppointment(@PathVariable Long appointmentId, Authentication authentication) {
        Long requesterUserId = (Long) authentication.getPrincipal();
        boolean admin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        return appointmentService.cancelAppointment(appointmentId, requesterUserId, admin);
    }

    /**
     * Check-in via QR code or manual code entry.
     * Body: { "checkInCode": "ABCD12" }
     * Either patient (their own) or doctor (their patient's) can check in.
     */
    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    public AppointmentResponse checkIn(@RequestBody java.util.Map<String, String> body, Authentication authentication) {
        String code = body.get("checkInCode");
        if (code == null || code.isBlank()) throw new IllegalArgumentException("Check-in code is required");
        Long userId = (Long) authentication.getPrincipal();
        boolean isDoctor = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_DOCTOR"));
        return appointmentService.checkIn(code.trim(), userId, isDoctor);
    }

    /**
     * POST /api/appointments/{id}/review
     * Called by patient after appointment to confirm attendance and rate the doctor.
     * Sets appointment.reviewed = true and saves Rating if attended.
     */
    @PostMapping("/{appointmentId}/review")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public AppointmentResponse reviewAppointment(
        @PathVariable Long appointmentId,
        @Valid @RequestBody ReviewRequest request,
        Authentication authentication
    ) {
        Long patientUserId = (Long) authentication.getPrincipal();
        return appointmentService.reviewAppointment(appointmentId, patientUserId, request);
    }

    /**
     * PUT /api/appointments/{id}/reschedule
     * Called by patient (or admin) to move a BOOKED appointment to a new time slot.
     */
    @PutMapping("/{appointmentId}/reschedule")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public AppointmentResponse rescheduleAppointment(
        @PathVariable Long appointmentId,
        @Valid @RequestBody RescheduleRequest request,
        Authentication authentication
    ) {
        Long requesterUserId = (Long) authentication.getPrincipal();
        boolean admin = authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        return appointmentService.rescheduleAppointment(appointmentId, requesterUserId, admin, request);
    }
}
