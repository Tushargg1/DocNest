package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.AvailableSlotsResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.BookAppointmentRequest;
import com.doctpjt.clinicapp.dto.AppointmentDtos.ReviewRequest;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.Rating;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.DoctorLeaveRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.RatingRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ClinicRepository clinicRepository;
    private final RatingRepository ratingRepository;
    private final DoctorLeaveRepository doctorLeaveRepository;

    public AppointmentService(AppointmentRepository appointmentRepository, DoctorProfileRepository doctorProfileRepository, ClinicRepository clinicRepository, RatingRepository ratingRepository, DoctorLeaveRepository doctorLeaveRepository) {
        this.appointmentRepository = appointmentRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.clinicRepository = clinicRepository;
        this.ratingRepository = ratingRepository;
        this.doctorLeaveRepository = doctorLeaveRepository;
    }

    public AvailableSlotsResponse getAvailableSlots(Long doctorUserId, LocalDate date) {
        DoctorProfile doctor = doctorProfileRepository.findByUserId(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        if (doctor.getApprovalStatus() != DoctorApprovalStatus.ACTIVE || doctor.getClinicId() == null) {
            throw new IllegalArgumentException("Doctor is not available for booking");
        }

        // Check if doctor is on leave
        if (doctorLeaveRepository.existsByDoctorUserIdAndLeaveDate(doctorUserId, date)) {
            return new AvailableSlotsResponse(doctorUserId, date, List.of());
        }

        LocalTime startWork = LocalTime.parse(doctor.getWorkStart());
        LocalTime endWork = LocalTime.parse(doctor.getWorkEnd());
        int slotDuration = doctor.getSlotDurationMinutes() == null ? 20 : doctor.getSlotDurationMinutes();

        List<LocalDateTime> slots = new ArrayList<>();
        LocalDateTime slot = LocalDateTime.of(date, startWork);
        LocalDateTime endDateTime = LocalDateTime.of(date, endWork);
        // Don't show slots in the past — patients should book at least 15 min in the future
        LocalDateTime minBookingTime = LocalDateTime.now().plusMinutes(15);

        while (slot.plusMinutes(slotDuration).isBefore(endDateTime) || slot.plusMinutes(slotDuration).equals(endDateTime)) {
            // Skip past slots (only relevant when date == today)
            if (slot.isBefore(minBookingTime)) {
                slot = slot.plusMinutes(slotDuration);
                continue;
            }
            boolean booked = appointmentRepository.existsByDoctorUserIdAndStartTimeAndStatus(
                doctorUserId,
                slot,
                AppointmentStatus.BOOKED
            );
            if (!booked) {
                slots.add(slot);
            }
            slot = slot.plusMinutes(slotDuration);
        }

        return new AvailableSlotsResponse(doctorUserId, date, slots);
    }

    public AppointmentResponse book(BookAppointmentRequest request) {
        DoctorProfile doctor = doctorProfileRepository.findByUserId(request.doctorUserId())
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        if (doctor.getApprovalStatus() != DoctorApprovalStatus.ACTIVE || doctor.getClinicId() == null) {
            throw new IllegalArgumentException("Doctor is not available for booking");
        }

        if (!doctor.getClinicId().equals(request.clinicId())) {
            throw new IllegalArgumentException("Clinic does not match doctor assignment");
        }

        Clinic clinic = clinicRepository.findById(request.clinicId())
            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));

        if (!clinic.isApproved()) {
            throw new IllegalArgumentException("Clinic is waiting for admin approval");
        }

        int slotDuration = doctor.getSlotDurationMinutes() == null ? 20 : doctor.getSlotDurationMinutes();
        if (appointmentRepository.existsByDoctorUserIdAndStartTimeAndStatus(request.doctorUserId(), request.startTime(), AppointmentStatus.BOOKED)) {
            throw new IllegalArgumentException("Slot already booked");
        }

        Appointment appointment = new Appointment();
        appointment.setDoctorUserId(request.doctorUserId());
        appointment.setPatientUserId(request.patientUserId());
        appointment.setClinicId(request.clinicId());
        appointment.setTokenNumber(generateTokenNumber(doctor, request.clinicId(), request.startTime()));
        appointment.setCheckInCode(generateCheckInCode());
        appointment.setStartTime(request.startTime());
        appointment.setEndTime(request.startTime().plusMinutes(slotDuration));
        appointment.setStatus(AppointmentStatus.BOOKED);

        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    public List<AppointmentResponse> getPatientAppointments(Long patientUserId) {
        return appointmentRepository.findByPatientUserId(patientUserId).stream().map(this::toResponse).toList();
    }

    public List<AppointmentResponse> getDoctorAppointments(Long doctorUserId, LocalDate date) {
        if (date == null) {
            return appointmentRepository.findByDoctorUserId(doctorUserId).stream().map(this::toResponse).toList();
        }

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay().minusNanos(1);
        return appointmentRepository.findByDoctorUserIdAndStartTimeBetween(doctorUserId, start, end)
            .stream().map(this::toResponse).toList();
    }

    public AppointmentResponse cancelAppointment(Long appointmentId, Long requesterUserId, boolean admin) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        if (!admin && !appointment.getPatientUserId().equals(requesterUserId)) {
            throw new IllegalArgumentException("You can only cancel your own appointment");
        }

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException("Appointment already cancelled");
        }

        if (appointment.getStatus() == AppointmentStatus.COMPLETED || appointment.getStatus() == AppointmentStatus.ATTENDED) {
            throw new IllegalArgumentException("Already attended/completed appointment cannot be cancelled");
        }

        if (appointment.getStatus() == AppointmentStatus.MISSED) {
            throw new IllegalArgumentException("Missed appointment cannot be cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    public AppointmentResponse reviewAppointment(Long appointmentId, Long patientUserId, ReviewRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        if (!appointment.getPatientUserId().equals(patientUserId)) {
            throw new IllegalArgumentException("You can only review your own appointments");
        }

        appointment.setReviewed(true);
        appointment.setAttendedConfirmed(request.attended());
        appointmentRepository.save(appointment);

        // Save doctor rating if patient attended and provided a score
        if (Boolean.TRUE.equals(request.attended()) && request.rating() != null) {
            Rating rating = new Rating();
            rating.setDoctorUserId(appointment.getDoctorUserId());
            rating.setPatientUserId(patientUserId);
            rating.setScore(request.rating());
            rating.setReview(request.comment());
            ratingRepository.save(rating);
        }

        return toResponse(appointment);
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        return new AppointmentResponse(
            appointment.getId(),
            appointment.getDoctorUserId(),
            appointment.getPatientUserId(),
            appointment.getClinicId(),
            appointment.getTokenNumber(),
            appointment.getCheckInCode(),
            appointment.getStartTime(),
            appointment.getEndTime(),
            appointment.getStatus().name(),
            appointment.isReviewed(),
            appointment.getAttendedConfirmed()
        );
    }

    private String generateTokenNumber(DoctorProfile doctor, Long clinicId, LocalDateTime startTime) {
        String specialization = doctor.getSpecialization() == null ? "X" : doctor.getSpecialization().trim().toUpperCase(Locale.ROOT);
        char prefix = 'X';
        for (int i = 0; i < specialization.length(); i++) {
            char ch = specialization.charAt(i);
            if (ch >= 'A' && ch <= 'Z') {
                prefix = ch;
                break;
            }
        }
        final char tokenPrefix = prefix;

        LocalDate day = startTime.toLocalDate();
        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end = day.plusDays(1).atStartOfDay().minusNanos(1);
        List<Appointment> dailyAppointments = appointmentRepository.findByClinicIdAndStartTimeBetween(clinicId, start, end);

        int next = dailyAppointments.stream()
            .map(Appointment::getTokenNumber)
            .filter(token -> token != null && token.length() == 4 && token.charAt(0) == tokenPrefix)
            .map(token -> token.substring(1))
            .filter(number -> number.chars().allMatch(Character::isDigit))
            .map(Integer::parseInt)
            .max(Comparator.naturalOrder())
            .orElse(0) + 1;

        return String.format("%c%03d", tokenPrefix, next);
    }

    /**
     * Generates a 6-character alphanumeric check-in code (excluding ambiguous chars).
     */
    private String generateCheckInCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    /**
     * Mark appointment as ATTENDED via QR code/check-in code.
     * Either patient (with their own appointment) or doctor (scanning patient's code) can call this.
     */
    public AppointmentResponse checkIn(String checkInCode, Long requesterUserId, boolean isDoctor) {
        Appointment appointment = appointmentRepository.findAll().stream()
            .filter(a -> checkInCode.equalsIgnoreCase(a.getCheckInCode()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid check-in code"));

        // Authorization: either the patient themselves OR the doctor for this appointment
        if (!isDoctor && !appointment.getPatientUserId().equals(requesterUserId)) {
            throw new IllegalArgumentException("Not authorized to check in this appointment");
        }
        if (isDoctor && !appointment.getDoctorUserId().equals(requesterUserId)) {
            throw new IllegalArgumentException("This appointment is not yours to mark");
        }

        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw new IllegalArgumentException("Only booked appointments can be checked in. Current status: " + appointment.getStatus());
        }

        appointment.setStatus(AppointmentStatus.ATTENDED);
        appointment.setAttendedConfirmed(true);
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    /**
     * Auto-mark past BOOKED appointments as MISSED if they are over 4 hours past start time.
     * Called from scheduled task.
     */
    public int autoMarkMissedAppointments() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(4);
        List<Appointment> stale = appointmentRepository.findAll().stream()
            .filter(a -> a.getStatus() == AppointmentStatus.BOOKED)
            .filter(a -> a.getStartTime() != null && a.getStartTime().isBefore(cutoff))
            .toList();
        for (Appointment a : stale) {
            a.setStatus(AppointmentStatus.MISSED);
            a.setAttendedConfirmed(false);
        }
        if (!stale.isEmpty()) appointmentRepository.saveAll(stale);
        return stale.size();
    }
}
