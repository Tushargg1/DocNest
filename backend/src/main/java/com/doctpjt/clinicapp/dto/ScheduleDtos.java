package com.doctpjt.clinicapp.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ScheduleDtos {

    public record WeekScheduleResponse(
        Long doctorUserId,
        LocalDate weekStart,
        LocalDate weekEnd,
        String workStart,
        String workEnd,
        int slotDurationMinutes,
        List<DaySchedule> days
    ) {}

    public record DaySchedule(
        LocalDate date,
        String dayName,
        boolean onLeave,
        String leaveReason,
        int totalSlots,
        int bookedSlots,
        int availableSlots,
        List<SlotInfo> slots
    ) {}

    public record SlotInfo(
        LocalDateTime startTime,
        LocalDateTime endTime,
        String status,
        String patientName
    ) {}
}
