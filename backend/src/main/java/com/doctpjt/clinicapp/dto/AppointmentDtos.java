package com.doctpjt.clinicapp.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class AppointmentDtos {

    public record BookAppointmentRequest(
        @NotNull(message = "Doctor ID is required")
        Long doctorUserId,
        
        @NotNull(message = "Patient ID is required")
        Long patientUserId,
        
        @NotNull(message = "Clinic ID is required")
        Long clinicId,
        
        @NotNull(message = "Start time is required")
        LocalDateTime startTime
    ) {}

    public record AppointmentResponse(
        Long appointmentId,
        Long doctorUserId,
        Long patientUserId,
        Long clinicId,
        String tokenNumber,
        String checkInCode,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String status,
        boolean reviewed,
        Boolean attendedConfirmed
    ) {}

    public record AvailableSlotsResponse(Long doctorUserId, LocalDate date, List<LocalDateTime> availableSlots) {}

    public record ReviewRequest(
        @NotNull
        Boolean attended,
        Integer rating,   // 1–5 stars
        String comment
    ) {}

    public record RescheduleRequest(
        @NotNull(message = "New start time is required")
        LocalDateTime newStartTime
    ) {}
}
