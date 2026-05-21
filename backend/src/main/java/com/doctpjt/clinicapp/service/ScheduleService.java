package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.ScheduleDtos.DaySchedule;
import com.doctpjt.clinicapp.dto.ScheduleDtos.SlotInfo;
import com.doctpjt.clinicapp.dto.ScheduleDtos.WeekScheduleResponse;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.DoctorLeave;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.DoctorLeaveRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ScheduleService {

    private final DoctorProfileRepository doctorProfileRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorLeaveRepository doctorLeaveRepository;
    private final UserRepository userRepository;

    public ScheduleService(
        DoctorProfileRepository doctorProfileRepository,
        AppointmentRepository appointmentRepository,
        DoctorLeaveRepository doctorLeaveRepository,
        UserRepository userRepository
    ) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorLeaveRepository = doctorLeaveRepository;
        this.userRepository = userRepository;
    }

    public WeekScheduleResponse getWeekSchedule(Long doctorUserId, LocalDate startDate, boolean includePatientNames) {
        DoctorProfile doctor = doctorProfileRepository.findByUserId(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        // Ensure startDate is a Monday
        LocalDate weekStart = startDate.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6); // Sunday

        String workStart = doctor.getWorkStart() != null ? doctor.getWorkStart() : "09:00";
        String workEnd = doctor.getWorkEnd() != null ? doctor.getWorkEnd() : "17:00";
        int slotDuration = doctor.getSlotDurationMinutes() != null ? doctor.getSlotDurationMinutes() : 20;

        // Fetch leaves for the week
        List<DoctorLeave> leaves = doctorLeaveRepository.findByDoctorUserIdAndLeaveDateBetween(
            doctorUserId, weekStart, weekEnd
        );
        Set<LocalDate> leaveDates = leaves.stream()
            .map(DoctorLeave::getLeaveDate)
            .collect(Collectors.toSet());
        Map<LocalDate, String> leaveReasons = leaves.stream()
            .collect(Collectors.toMap(DoctorLeave::getLeaveDate, l -> l.getReason() != null ? l.getReason() : ""));

        // Fetch all appointments for the week
        LocalDateTime weekStartDateTime = weekStart.atStartOfDay();
        LocalDateTime weekEndDateTime = weekEnd.plusDays(1).atStartOfDay().minusNanos(1);
        List<Appointment> weekAppointments = appointmentRepository.findByDoctorUserIdAndStartTimeBetween(
            doctorUserId, weekStartDateTime, weekEndDateTime
        );

        // Group booked appointments by date
        Map<LocalDate, List<Appointment>> appointmentsByDate = weekAppointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.BOOKED || a.getStatus() == AppointmentStatus.ATTENDED)
            .collect(Collectors.groupingBy(a -> a.getStartTime().toLocalDate()));

        // Build day schedules (Mon-Sun)
        List<DaySchedule> days = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate day = weekStart.plusDays(i);
            boolean onLeave = leaveDates.contains(day);
            String leaveReason = leaveReasons.getOrDefault(day, "");
            String dayName = day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);

            // Skip Sunday (no working day) unless doctor has explicit schedule
            if (day.getDayOfWeek() == DayOfWeek.SUNDAY) {
                days.add(new DaySchedule(day, dayName, false, "", 0, 0, 0, List.of()));
                continue;
            }

            if (onLeave) {
                days.add(new DaySchedule(day, dayName, true, leaveReason, 0, 0, 0, List.of()));
                continue;
            }

            // Generate time slots for this day
            LocalTime start = LocalTime.parse(workStart);
            LocalTime end = LocalTime.parse(workEnd);
            List<Appointment> dayAppointments = appointmentsByDate.getOrDefault(day, List.of());

            // Map appointments by start time for quick lookup
            Map<LocalDateTime, Appointment> bookedMap = dayAppointments.stream()
                .collect(Collectors.toMap(
                    Appointment::getStartTime,
                    a -> a,
                    (a1, a2) -> a1 // In case of duplicates, keep first
                ));

            List<SlotInfo> slots = new ArrayList<>();
            LocalDateTime slotTime = LocalDateTime.of(day, start);
            LocalDateTime endDateTime = LocalDateTime.of(day, end);

            while (slotTime.plusMinutes(slotDuration).isBefore(endDateTime) || slotTime.plusMinutes(slotDuration).equals(endDateTime)) {
                LocalDateTime slotEnd = slotTime.plusMinutes(slotDuration);
                Appointment booked = bookedMap.get(slotTime);

                String status;
                String patientName = null;

                if (booked != null) {
                    status = "booked";
                    if (includePatientNames && booked.getPatientUserId() != null) {
                        patientName = userRepository.findById(booked.getPatientUserId())
                            .map(User::getFullName)
                            .orElse("Patient #" + booked.getPatientUserId());
                    }
                } else {
                    // Check if slot is in the past
                    if (slotTime.isBefore(LocalDateTime.now())) {
                        status = "past";
                    } else {
                        status = "available";
                    }
                }

                slots.add(new SlotInfo(slotTime, slotEnd, status, patientName));
                slotTime = slotTime.plusMinutes(slotDuration);
            }

            int totalSlots = slots.size();
            int bookedSlots = (int) slots.stream().filter(s -> "booked".equals(s.status())).count();
            int availableSlots = (int) slots.stream().filter(s -> "available".equals(s.status())).count();

            days.add(new DaySchedule(day, dayName, false, "", totalSlots, bookedSlots, availableSlots, slots));
        }

        return new WeekScheduleResponse(
            doctorUserId, weekStart, weekEnd, workStart, workEnd, slotDuration, days
        );
    }
}
