package com.doctpjt.clinicapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class VisitDtos {

    public record VisitCreateRequest(
        @NotNull(message = "Appointment ID is required")
        Long appointmentId,
        
        @NotNull(message = "Doctor ID is required")
        Long doctorUserId,
        
        @NotNull(message = "Patient ID is required")
        Long patientUserId,
        
        @NotNull(message = "Visit date is required")
        LocalDate visitDate,
        
        @NotBlank(message = "Diagnosis is required")
        String diagnosis,
        
        String diseaseHistory,
        
        String medications,

        // Optional: follow-up date set by doctor — triggers reminder to patient 1 day before
        LocalDate revisitDate,

        // Optional: URL of uploaded prescription photo
        String prescriptionPhotoUrl
    ) {}

    public record VisitResponse(
        Long id,
        Long appointmentId,
        Long doctorUserId,
        Long patientUserId,
        LocalDate visitDate,
        String diagnosis,
        String diseaseHistory,
        String medications,
        LocalDate revisitDate,
        String prescriptionPhotoUrl
    ) {}
}
