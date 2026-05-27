package com.doctpjt.clinicapp.dto;

import java.time.LocalDateTime;
import java.util.List;

public class WorkspaceDtos {

    public record DoctorPatientSummaryResponse(
        Long patientUserId,
        String patientName,
        String email,
        String phoneNumber,
        Integer pastVisits,
        LocalDateTime lastVisitTime,
        String lastDiagnosis,
        String lastMedications,
        Integer upcomingAppointments,
        LocalDateTime nextAppointmentTime
    ) {}

    public record DoctorDashboardResponse(
        Long doctorUserId,
        Long clinicId,
        String clinicName,
        String approvalStatus,
        String photoUrl,
        List<DoctorPatientSummaryResponse> patients,
        List<AppointmentDtos.AppointmentResponse> upcomingAppointments
    ) {}

    public record ClinicDashboardResponse(
        Long clinicId,
        String clinicName,
        boolean approved,
        List<ClinicDtos.ClinicDoctorResponse> doctors,
        List<ClinicDtos.ClinicPatientResponse> patients,
        List<AppointmentDtos.AppointmentResponse> upcomingAppointments,
        List<AppointmentDtos.AppointmentResponse> allAppointments,
        List<VisitDtos.VisitResponse> allVisits
    ) {}
}