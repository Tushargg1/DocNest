package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.audit.AuditAccess;
import com.doctpjt.clinicapp.entity.DoctorDegree;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorLeave;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.Rating;
import com.doctpjt.clinicapp.repository.DoctorDegreeRepository;
import com.doctpjt.clinicapp.repository.DoctorLeaveRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.RatingRepository;
import com.doctpjt.clinicapp.service.ClinicalEmbeddingService;
import com.doctpjt.clinicapp.service.ScheduleService;
import com.doctpjt.clinicapp.dto.ScheduleDtos.WeekScheduleResponse;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import com.doctpjt.clinicapp.dto.WorkspaceDtos.DoctorDashboardResponse;
import com.doctpjt.clinicapp.dto.WorkspaceDtos.DoctorPatientSummaryResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorProfileRepository doctorProfileRepository;
    private final DoctorDegreeRepository doctorDegreeRepository;
    private final DoctorLeaveRepository doctorLeaveRepository;
    private final RatingRepository ratingRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final ClinicalEmbeddingService clinicalEmbeddingService;
    private final ScheduleService scheduleService;

    public DoctorController(
        DoctorProfileRepository doctorProfileRepository,
        DoctorDegreeRepository doctorDegreeRepository,
        DoctorLeaveRepository doctorLeaveRepository,
        RatingRepository ratingRepository,
        AppointmentRepository appointmentRepository,
        VisitRecordRepository visitRecordRepository,
        UserRepository userRepository,
        ClinicRepository clinicRepository,
        ClinicalEmbeddingService clinicalEmbeddingService,
        ScheduleService scheduleService
    ) {
        this.doctorProfileRepository = doctorProfileRepository;
        this.doctorDegreeRepository = doctorDegreeRepository;
        this.doctorLeaveRepository = doctorLeaveRepository;
        this.ratingRepository = ratingRepository;
        this.appointmentRepository = appointmentRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.userRepository = userRepository;
        this.clinicRepository = clinicRepository;
        this.clinicalEmbeddingService = clinicalEmbeddingService;
        this.scheduleService = scheduleService;
    }

    @PostMapping("/profile")
    @PreAuthorize("hasRole('ADMIN') or (#profile.userId == principal and hasRole('DOCTOR'))")
    public DoctorProfile createOrUpdateProfile(@Valid @RequestBody DoctorProfile profile, Authentication authentication) {
        DoctorProfile existing = doctorProfileRepository.findByUserId(profile.getUserId()).orElse(null);
        boolean admin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        if (existing != null) {
            existing.setClinicId(profile.getClinicId());
            existing.setSpecialization(profile.getSpecialization());
            existing.setBio(profile.getBio());
            existing.setWorkStart(profile.getWorkStart());
            existing.setWorkEnd(profile.getWorkEnd());
            existing.setSlotDurationMinutes(profile.getSlotDurationMinutes());
            existing.setRoomId(profile.getRoomId());
            existing.setAge(profile.getAge());
            existing.setGender(profile.getGender());
            existing.setOccupation(profile.getOccupation());
            existing.setConsultationFee(profile.getConsultationFee());
            // Only reset approval status if updating fields that need re-review (not when just editing bio etc.)
            if (!admin && existing.getApprovalStatus() == DoctorApprovalStatus.ACTIVE) {
                // Keep ACTIVE status for existing doctors doing minor edits
            } else if (!admin) {
                existing.setApprovalStatus(DoctorApprovalStatus.PENDING_REVIEW);
            }
            return doctorProfileRepository.save(existing);
        }
        // New profiles: ACTIVE by default (matching entity default), admin always ACTIVE
        profile.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        return doctorProfileRepository.save(profile);
    }

    @GetMapping("/{doctorUserId}/profile")
    public DoctorProfile getProfile(@PathVariable Long doctorUserId, Authentication authentication) {
        // If the caller is the doctor themselves (or admin), return the profile regardless of approval status.
        boolean isSelf = false;
        boolean isAdmin = false;
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            Long callerId = (Long) authentication.getPrincipal();
            isSelf = callerId.equals(doctorUserId);
            isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        }

        if (isSelf || isAdmin) {
            return doctorProfileRepository.findByUserId(doctorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        }

        // Public access: only show ACTIVE profiles
        return doctorProfileRepository.findByUserId(doctorUserId)
            .filter(profile -> profile.getApprovalStatus() == DoctorApprovalStatus.ACTIVE)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
    }

    @PostMapping("/{doctorUserId}/degrees")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public DoctorDegree addDegree(@PathVariable Long doctorUserId, @Valid @RequestBody DoctorDegree degree) {
        degree.setDoctorUserId(doctorUserId);
        return doctorDegreeRepository.save(degree);
    }

    @GetMapping("/{doctorUserId}/degrees")
    public List<DoctorDegree> getDegrees(@PathVariable Long doctorUserId) {
        return doctorDegreeRepository.findByDoctorUserId(doctorUserId);
    }

    @PatchMapping("/degrees/{degreeId}/certificate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('DOCTOR')")
    public DoctorDegree uploadCertificate(@PathVariable Long degreeId, @RequestBody java.util.Map<String, String> body) {
        DoctorDegree degree = doctorDegreeRepository.findById(degreeId)
            .orElseThrow(() -> new IllegalArgumentException("Degree not found"));
        degree.setCertificateUrl(body.get("certificateUrl"));
        return doctorDegreeRepository.save(degree);
    }

    @PostMapping("/{doctorUserId}/ratings")
    @PreAuthorize("hasRole('ADMIN') or (#rating.patientUserId == principal and hasRole('PATIENT'))")
    public Rating addRating(@PathVariable Long doctorUserId, @Valid @RequestBody Rating rating) {
        rating.setDoctorUserId(doctorUserId);
        if (rating.getScore() == null || rating.getScore() < 1 || rating.getScore() > 5) {
            throw new IllegalArgumentException("Rating score must be between 1 and 5");
        }
        return ratingRepository.save(rating);
    }

    @GetMapping("/{doctorUserId}/ratings")
    public List<Rating> getRatings(@PathVariable Long doctorUserId) {
        return ratingRepository.findByDoctorUserId(doctorUserId);
    }

    @GetMapping("/{patientId}/summary")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    @AuditAccess(action = "GENERATE_AI_SUMMARY", subjectIdParam = "patientId")
    public String summarizePatientHistory(@PathVariable Long patientId, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
        if (!admin) {
            Long doctorUserId = (Long) authentication.getPrincipal();
            // Time-based access: only allow if patient has an active appointment TODAY with this doctor
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            LocalDateTime todayEnd = todayStart.plusDays(1);
            List<Appointment> todayAppointments = appointmentRepository.findByDoctorUserIdAndStartTimeBetween(
                doctorUserId, todayStart, todayEnd);
            boolean hasActiveToday = todayAppointments.stream()
                .anyMatch(a -> a.getPatientUserId().equals(patientId)
                    && a.getStatus() == AppointmentStatus.BOOKED);
            if (!hasActiveToday) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Patient data is only accessible during active appointments");
            }
        }
        return clinicalEmbeddingService.generatePatientSummary(patientId);
    }

    @GetMapping("/{doctorUserId}/dashboard")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public DoctorDashboardResponse getDashboard(@PathVariable Long doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(doctorUserId).orElse(null);

        if (profile == null) {
            return new DoctorDashboardResponse(
                doctorUserId,
                null,
                null,
                DoctorApprovalStatus.PENDING_REVIEW.name(),
                null,
                List.of(),
                List.of()
            );
        }

        Clinic clinic = profile.getClinicId() != null ? clinicRepository.findById(profile.getClinicId()).orElse(null) : null;
        List<Appointment> appointments = appointmentRepository.findByDoctorUserId(doctorUserId);
        List<AppointmentResponse> upcomingAppointments = appointments.stream()
            .filter(appointment -> appointment.getStatus() == AppointmentStatus.BOOKED && appointment.getStartTime() != null && appointment.getStartTime().isAfter(LocalDateTime.now()))
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .map(appointment -> new AppointmentResponse(
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
            ))
            .toList();

        Map<Long, List<Appointment>> appointmentsByPatient = appointments.stream()
            .filter(appointment -> appointment.getPatientUserId() != null)
            .collect(Collectors.groupingBy(Appointment::getPatientUserId));

        Map<Long, VisitRecord> latestVisitByPatient = visitRecordRepository.findByDoctorUserIdOrderByVisitDateDesc(doctorUserId).stream()
            .collect(Collectors.toMap(
                VisitRecord::getPatientUserId,
                visit -> visit,
                (left, right) -> left
            ));

        List<DoctorPatientSummaryResponse> patients = appointmentsByPatient.entrySet().stream()
            .map(entry -> {
                Long patientUserId = entry.getKey();
                List<Appointment> patientAppointments = entry.getValue();
                VisitRecord lastVisit = latestVisitByPatient.get(patientUserId);
                User patient = userRepository.findById(patientUserId).orElse(null);
                Optional<Appointment> nextAppointment = patientAppointments.stream()
                    .filter(appointment -> appointment.getStatus() == AppointmentStatus.BOOKED && appointment.getStartTime() != null && appointment.getStartTime().isAfter(LocalDateTime.now()))
                    .sorted(Comparator.comparing(Appointment::getStartTime))
                    .findFirst();
                return new DoctorPatientSummaryResponse(
                    patientUserId,
                    patient != null ? patient.getFullName() : "Unknown",
                    patient != null ? patient.getEmail() : null,
                    patient != null ? patient.getPhoneNumber() : null,
                    (int) visitRecordRepository.findByDoctorUserIdAndPatientUserIdOrderByVisitDateDesc(doctorUserId, patientUserId).size(),
                    lastVisit != null && lastVisit.getVisitDate() != null ? lastVisit.getVisitDate().atStartOfDay() : null,
                    lastVisit != null ? lastVisit.getDiagnosis() : null,
                    lastVisit != null ? lastVisit.getMedications() : null,
                    (int) patientAppointments.stream().filter(appointment -> appointment.getStatus() == AppointmentStatus.BOOKED && appointment.getStartTime() != null && appointment.getStartTime().isAfter(LocalDateTime.now())).count(),
                    nextAppointment.map(Appointment::getStartTime).orElse(null)
                );
            })
            .sorted(Comparator.comparing(DoctorPatientSummaryResponse::nextAppointmentTime, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();

        return new DoctorDashboardResponse(
            doctorUserId,
            clinic != null ? clinic.getId() : null,
            clinic != null ? clinic.getName() : null,
            profile.getApprovalStatus() != null ? profile.getApprovalStatus().name() : DoctorApprovalStatus.ACTIVE.name(),
            profile.getPhotoUrl(),
            patients,
            upcomingAppointments
        );
    }

    // === Doctor Weekly Schedule ===

    @GetMapping("/{doctorUserId}/schedule/week")
    public WeekScheduleResponse getWeekSchedule(
        @PathVariable Long doctorUserId,
        @RequestParam(required = false) LocalDate startDate,
        Authentication authentication
    ) {
        // Determine if the caller is the doctor themselves (to show patient names)
        boolean includePatientNames = false;
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            Long callerId = (Long) authentication.getPrincipal();
            boolean isDoctor = callerId.equals(doctorUserId);
            boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            includePatientNames = isDoctor || isAdmin;
        }

        LocalDate start = startDate != null ? startDate : LocalDate.now();
        return scheduleService.getWeekSchedule(doctorUserId, start, includePatientNames);
    }

    // === Doctor Leave Management ===

    @GetMapping("/{doctorUserId}/leaves")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public List<DoctorLeave> getLeaves(@PathVariable Long doctorUserId) {
        return doctorLeaveRepository.findByDoctorUserIdAndLeaveDateGreaterThanEqual(doctorUserId, java.time.LocalDate.now());
    }

    @PostMapping("/{doctorUserId}/leaves")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public DoctorLeave addLeave(@PathVariable Long doctorUserId, @RequestBody DoctorLeave leave) {
        leave.setDoctorUserId(doctorUserId);
        if (leave.getLeaveDate() == null) {
            throw new IllegalArgumentException("Leave date is required");
        }
        if (leave.getLeaveDate().isBefore(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("Cannot add leave for past dates");
        }
        if (doctorLeaveRepository.existsByDoctorUserIdAndLeaveDate(doctorUserId, leave.getLeaveDate())) {
            throw new IllegalArgumentException("Leave already exists for this date");
        }

        DoctorLeave saved = doctorLeaveRepository.save(leave);

        // Auto-cancel booked appointments on leave day if requested
        if (leave.isCancelAppointments()) {
            java.time.LocalDateTime start = leave.getLeaveDate().atStartOfDay();
            java.time.LocalDateTime end = leave.getLeaveDate().plusDays(1).atStartOfDay().minusNanos(1);
            appointmentRepository.findByDoctorUserIdAndStartTimeBetween(doctorUserId, start, end)
                .stream()
                .filter(appt -> appt.getStatus() == AppointmentStatus.BOOKED)
                .forEach(appt -> {
                    appt.setStatus(AppointmentStatus.CANCELLED);
                    appointmentRepository.save(appt);
                });
        }

        return saved;
    }

    @DeleteMapping("/{doctorUserId}/leaves/{leaveId}")
    @PreAuthorize("hasRole('ADMIN') or (#doctorUserId == principal and hasRole('DOCTOR'))")
    public java.util.Map<String, String> deleteLeave(@PathVariable Long doctorUserId, @PathVariable Long leaveId) {
        DoctorLeave leave = doctorLeaveRepository.findById(leaveId)
            .orElseThrow(() -> new IllegalArgumentException("Leave not found"));
        if (!leave.getDoctorUserId().equals(doctorUserId)) {
            throw new IllegalArgumentException("Leave does not belong to this doctor");
        }
        doctorLeaveRepository.delete(leave);
        return java.util.Map.of("status", "deleted");
    }

    // === Appointment No-Show Tracking ===

    @PostMapping("/appointments/{appointmentId}/no-show")
    @PreAuthorize("hasRole('DOCTOR') or hasRole('ADMIN')")
    public AppointmentResponse markNoShow(@PathVariable Long appointmentId, Authentication authentication) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        Long doctorUserId = (Long) authentication.getPrincipal();
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin && !appointment.getDoctorUserId().equals(doctorUserId)) {
            throw new IllegalArgumentException("Not authorized to mark this appointment");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointment.setAttendedConfirmed(false);
        appointmentRepository.save(appointment);

        return new AppointmentResponse(
            appointment.getId(), appointment.getDoctorUserId(), appointment.getPatientUserId(),
            appointment.getClinicId(), appointment.getTokenNumber(), appointment.getCheckInCode(), appointment.getStartTime(),
            appointment.getEndTime(), appointment.getStatus().name(), appointment.isReviewed(),
            appointment.getAttendedConfirmed()
        );
    }

    // === Appointment Rescheduling ===

    @PostMapping("/appointments/{appointmentId}/reschedule")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public AppointmentResponse rescheduleAppointment(
        @PathVariable Long appointmentId,
        @RequestBody java.util.Map<String, String> body,
        Authentication authentication
    ) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        Long requesterUserId = (Long) authentication.getPrincipal();
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin && !appointment.getPatientUserId().equals(requesterUserId)) {
            throw new IllegalArgumentException("You can only reschedule your own appointments");
        }

        if (appointment.getStatus() != AppointmentStatus.BOOKED) {
            throw new IllegalArgumentException("Only booked appointments can be rescheduled");
        }

        String newStartTimeStr = body.get("newStartTime");
        if (newStartTimeStr == null || newStartTimeStr.isBlank()) {
            throw new IllegalArgumentException("newStartTime is required");
        }

        java.time.LocalDateTime newStartTime = java.time.LocalDateTime.parse(newStartTimeStr);

        // Check new slot is available
        if (appointmentRepository.existsByDoctorUserIdAndStartTimeAndStatus(
            appointment.getDoctorUserId(), newStartTime, AppointmentStatus.BOOKED)) {
            throw new IllegalArgumentException("New time slot is already taken");
        }

        // Check doctor is not on leave
        if (doctorLeaveRepository.existsByDoctorUserIdAndLeaveDate(appointment.getDoctorUserId(), newStartTime.toLocalDate())) {
            throw new IllegalArgumentException("Doctor is on leave on that date");
        }

        DoctorProfile doctor = doctorProfileRepository.findByUserId(appointment.getDoctorUserId()).orElse(null);
        int slotDuration = (doctor != null && doctor.getSlotDurationMinutes() != null) ? doctor.getSlotDurationMinutes() : 20;

        appointment.setStartTime(newStartTime);
        appointment.setEndTime(newStartTime.plusMinutes(slotDuration));
        Appointment saved = appointmentRepository.save(appointment);

        return new AppointmentResponse(
            saved.getId(), saved.getDoctorUserId(), saved.getPatientUserId(),
            saved.getClinicId(), saved.getTokenNumber(), saved.getCheckInCode(), saved.getStartTime(),
            saved.getEndTime(), saved.getStatus().name(), saved.isReviewed(),
            saved.getAttendedConfirmed()
        );
    }
}
