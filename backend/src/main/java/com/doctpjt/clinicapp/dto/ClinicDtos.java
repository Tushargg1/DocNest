package com.doctpjt.clinicapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.List;

public class ClinicDtos {

    public record ClinicCreateRequest(
        @NotBlank(message = "Clinic name is required")
        String name,
        
        @NotBlank(message = "Address is required")
        String address,
        
        @NotBlank(message = "Phone is required")
        String phone,
        
        @NotNull(message = "Latitude is required")
        Double latitude,
        
        @NotNull(message = "Longitude is required")
        Double longitude,
        
        @NotNull(message = "Owner User ID is required")
        Long ownerUserId
    ) {}

    public record DoctorCardResponse(
        Long doctorUserId,
        Long clinicId,
        String doctorName,
        String specialization,
        String bio,
        String roomId,
        Integer age,
        String gender,
        String occupation,
        String clinicName,
        String clinicAddress,
        Double distanceKm,
        List<String> degrees,
        Double averageRating
    ) {}

    public record ClinicDoctorResponse(
        Long doctorUserId,
        String doctorName,
        String specialization,
        String roomId,
        Integer age,
        String gender,
        String occupation,
        List<String> degrees,
        String approvalStatus,
        Integer upcomingAppointments,
        LocalDateTime nextAppointmentTime,
        String lastPatientName,
        LocalDateTime lastVisitTime
    ) {}

    public record ClinicPatientResponse(
        Long patientUserId,
        String patientName,
        String email,
        String phoneNumber,
        Integer totalAppointments,
        Integer upcomingAppointments,
        LocalDateTime nextAppointmentTime,
        String lastDoctorName,
        LocalDateTime lastVisitTime,
        boolean treatmentVisible
    ) {}

    public record DoctorRegisterByClinicRequest(
        @NotBlank(message = "Email is required")
        String email,
        @NotBlank(message = "Password is required")
        String password,
        @NotBlank(message = "Full Name is required")
        String fullName,
        @NotBlank(message = "Specialization is required")
        String specialization,
        String bio,
        String roomId,
        Integer age,
        String gender,
        @NotBlank(message = "Occupation/Degree is required")
        String occupation,
        List<String> degrees,
        Integer slotDurationMinutes,
        String workStart,
        String workEnd
    ) {}

    public record DoctorUpdateByClinicRequest(
        @NotBlank(message = "Full Name is required")
        String fullName,
        @NotBlank(message = "Specialization is required")
        String specialization,
        String bio,
        String roomId,
        Integer age,
        String gender,
        @NotBlank(message = "Occupation/Degree is required")
        String occupation,
        List<String> degrees,
        Integer slotDurationMinutes,
        String workStart,
        String workEnd
    ) {}
}
