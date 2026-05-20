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

        while (slot.plusMinutes(slotDuration).isBefore(endDateTime) || slot.plusMinutes(slotDuration).equals(endDateTime)) {
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

        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Completed appointment cannot be cancelled");
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
}
