package com.doctpjt.clinicapp.dto;

import java.util.List;

public class AnalyticsDtos {

    public record MonthlyCount(
        int month,
        int year,
        long count
    ) {}

    public record MonthlyRevenue(
        int month,
        int year,
        double revenue
    ) {}

    public record TopDoctorResponse(
        Long doctorUserId,
        String doctorName,
        String specialization,
        long appointmentCount,
        double averageRating
    ) {}

    public record StatusBreakdown(
        long completed,
        long cancelled,
        long missed,
        long booked,
        long attended,
        long total,
        double completedPercent,
        double cancelledPercent,
        double missedPercent
    ) {}

    public record ClinicAnalyticsResponse(
        List<MonthlyCount> monthlyVisits,
        List<MonthlyRevenue> monthlyRevenue,
        long totalPatients,
        long totalAppointments,
        double averageRating,
        List<TopDoctorResponse> topDoctors,
        StatusBreakdown statusBreakdown,
        long thisMonthVisits,
        double thisMonthRevenue
    ) {}
}
