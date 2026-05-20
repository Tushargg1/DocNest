package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AccessStatus;
import com.doctpjt.clinicapp.entity.AuditLog;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.AuditLogRepository;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import com.doctpjt.clinicapp.service.AdminService;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class AdminController {

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final AuditLogRepository auditLogRepository;
    private final AdminService adminService;

    public AdminController(
        UserRepository userRepository,
        ClinicRepository clinicRepository,
        AppointmentRepository appointmentRepository,
        VisitRecordRepository visitRecordRepository,
        AuditLogRepository auditLogRepository,
        AdminService adminService
    ) {
        this.userRepository = userRepository;
        this.clinicRepository = clinicRepository;
        this.appointmentRepository = appointmentRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.auditLogRepository = auditLogRepository;
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> dashboard() {
        List<User> users = userRepository.findAll();
        List<Clinic> clinics = clinicRepository.findAll();
        List<Appointment> appointments = appointmentRepository.findAll();
        List<VisitRecord> visits = visitRecordRepository.findAll();

        return Map.of(
            "totalUsers", users.size(),
            "users", users,
            "totalClinics", clinics.size(),
            "clinics", clinics,
            "totalAppointments", appointments.size(),
            "appointments", appointments,
            "totalVisits", visits.size(),
            "visits", visits
        );
    }

    @PostMapping("/cleanup-test-data")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> cleanupTestData(@RequestParam(defaultValue = "test.local") String emailDomain) {
        return adminService.cleanupTestData(emailDomain);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AuditLog> getAuditLogs(
        @RequestParam(required = false) Long actorId,
        @RequestParam(required = false) Long subjectId,
        @RequestParam(required = false) AccessStatus status,
        Pageable pageable
    ) {
        Specification<AuditLog> spec = Specification.where(null);

        if (actorId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("actorId"), actorId));
        }
        if (subjectId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("subjectId"), subjectId));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("accessStatus"), status));
        }

        return auditLogRepository.findAll(spec, pageable);
    }

    @GetMapping("/clinics/pending")
    public List<Clinic> getPendingClinics() {
        return clinicRepository.findByApproved(false);
    }

    @PostMapping("/clinics/approve")
    public String approveClinic(@RequestParam Long clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));
        clinic.setApproved(true);
        clinicRepository.save(clinic);
        return "Clinic approved successfully";
    }

    @PostMapping("/clinics/reject")
    public String rejectClinic(@RequestParam Long clinicId) {
        clinicRepository.deleteById(clinicId);
        return "Clinic application rejected";
    }
}
