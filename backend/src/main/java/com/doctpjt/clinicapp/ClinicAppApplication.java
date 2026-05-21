package com.doctpjt.clinicapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorDegree;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorDegreeRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Set;

@SpringBootApplication
@EnableScheduling
public class ClinicAppApplication {

    private static final Logger log = LoggerFactory.getLogger(ClinicAppApplication.class);
    private static final String DEFAULT_PASSWORD = "password123";

    public static void main(String[] args) {
        SpringApplication.run(ClinicAppApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedData(
        UserRepository userRepository,
        ClinicRepository clinicRepository,
        DoctorProfileRepository doctorProfileRepository,
        PatientProfileRepository patientProfileRepository,
        AppointmentRepository appointmentRepository,
        DoctorDegreeRepository doctorDegreeRepository,
        VisitRecordRepository visitRecordRepository,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            // Keep email optional for phone-first onboarding, even on existing schemas.
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");

            // Widen appointment status column to fit new enum values (ATTENDED, MISSED).
            try {
                jdbcTemplate.execute("ALTER TABLE appointments MODIFY COLUMN status VARCHAR(20) NOT NULL");
            } catch (Exception ignored) { /* best effort */ }

            // ── Seed users ───────────────────────────────────────────────────
            User admin       = seedUser(userRepository, passwordEncoder, "admin@test.com",          "Head Admin",       Role.ADMIN,   "9100000000");
            User patient     = seedUser(userRepository, passwordEncoder, "patient@test.com",        "Rahul Verma",      Role.PATIENT, "9100000001");
            User clinicOwner = seedUser(userRepository, passwordEncoder, "clinic@careplus.in",      "Care Plus Admin",  Role.CLINIC,  "9100000003");
            User doctor1     = seedUser(userRepository, passwordEncoder, "priya.sharma@careplus.in","Dr. Priya Sharma", Role.DOCTOR,  "9100000010");
            User doctor2     = seedUser(userRepository, passwordEncoder, "arjun.mehta@careplus.in", "Dr. Arjun Mehta",  Role.DOCTOR,  "9100000011");

            Set<Long> keepUserIds = Set.of(admin.getId(), patient.getId(), clinicOwner.getId(), doctor1.getId(), doctor2.getId());

            // ── Remove fake/old clinics that don't belong to our test clinic owner ──
            List<Clinic> allClinics = clinicRepository.findAll();
            for (Clinic c : allClinics) {
                if (!clinicOwner.getId().equals(c.getOwnerUserId())) {
                    appointmentRepository.findByClinicId(c.getId())
                        .forEach(appointmentRepository::delete);
                    doctorProfileRepository.findByClinicId(c.getId()).stream()
                        .filter(dp -> !keepUserIds.contains(dp.getUserId()))
                        .forEach(dp -> {
                            doctorDegreeRepository.findByDoctorUserId(dp.getUserId())
                                .forEach(doctorDegreeRepository::delete);
                            doctorProfileRepository.delete(dp);
                        });
                    clinicRepository.delete(c);
                    log.info("Removed old clinic: {} (id={})", c.getName(), c.getId());
                }
            }

            // ── Remove old users that are not our keepers ──
            userRepository.findAll().stream()
                .filter(u -> !keepUserIds.contains(u.getId()))
                .forEach(u -> {
                    // Clean visit records referencing this user
                    visitRecordRepository.findByDoctorUserIdOrderByVisitDateDesc(u.getId())
                        .forEach(visitRecordRepository::delete);
                    visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(u.getId())
                        .forEach(visitRecordRepository::delete);
                    doctorProfileRepository.findByUserId(u.getId()).ifPresent(dp -> {
                        doctorDegreeRepository.findByDoctorUserId(u.getId())
                            .forEach(doctorDegreeRepository::delete);
                        appointmentRepository.findByDoctorUserId(u.getId())
                            .forEach(appointmentRepository::delete);
                        doctorProfileRepository.delete(dp);
                    });
                    patientProfileRepository.findByUserId(u.getId())
                        .ifPresent(patientProfileRepository::delete);
                    appointmentRepository.findByPatientUserId(u.getId())
                        .forEach(appointmentRepository::delete);
                    userRepository.delete(u);
                    log.info("Removed old user: {} (id={})", u.getFullName(), u.getId());
                });

            // ── Remove orphan visit records that reference non-existent users ──
            visitRecordRepository.findAll().stream()
                .filter(v -> !keepUserIds.contains(v.getPatientUserId()) || !keepUserIds.contains(v.getDoctorUserId()))
                .forEach(v -> {
                    visitRecordRepository.delete(v);
                    log.info("Removed orphan visit record id={}", v.getId());
                });

            // ── Clinic ───────────────────────────────────────────────────────
            Clinic clinic = seedClinic(clinicRepository, clinicOwner.getId());

            // ── Doctor 1: Cardiologist ───────────────────────────────────────
            seedDoctorProfile(doctorProfileRepository, doctorDegreeRepository,
                doctor1.getId(), clinic.getId(),
                "Cardiology", "Heart specialist with 12 years of experience in interventional cardiology and preventive cardiac care.",
                20, "09:00", "17:00", "Room 201", 38, "Female", "Cardiologist",
                new String[]{"MBBS", "MD Cardiology", "DM Interventional Cardiology"},
                new String[]{"AIIMS Delhi", "PGI Chandigarh", "Medanta Gurugram"});

            // ── Doctor 2: Dermatologist ──────────────────────────────────────
            seedDoctorProfile(doctorProfileRepository, doctorDegreeRepository,
                doctor2.getId(), clinic.getId(),
                "Dermatology", "Skin and hair care specialist. Expert in cosmetic dermatology, acne treatment, and laser procedures.",
                30, "10:00", "18:00", "Room 105", 34, "Male", "Dermatologist",
                new String[]{"MBBS", "MD Dermatology"},
                new String[]{"Maulana Azad Medical College", "Safdarjung Hospital"});

            // ── Patient profile ──────────────────────────────────────────────
            seedPatientProfile(patientProfileRepository, patient.getId());

            log.info("============================================================");
            log.info(" DocNest seeded test logins (password: {} for all)", DEFAULT_PASSWORD);
            log.info("   ADMIN   - phone {}  /  email {}", admin.getPhoneNumber(),       admin.getEmail());
            log.info("   PATIENT - phone {}  /  email {}", patient.getPhoneNumber(),     patient.getEmail());
            log.info("   DOCTOR1 - phone {}  /  email {}", doctor1.getPhoneNumber(),     doctor1.getEmail());
            log.info("   DOCTOR2 - phone {}  /  email {}", doctor2.getPhoneNumber(),     doctor2.getEmail());
            log.info("   CLINIC  - phone {}  /  email {}", clinicOwner.getPhoneNumber(), clinicOwner.getEmail());
            log.info(" Clinic: '{}' id={} (approved)", clinic.getName(), clinic.getId());
            log.info("============================================================");
        };
    }

    private User seedUser(UserRepository repo, PasswordEncoder encoder, String email, String name, Role role, String phone) {
        User user = repo.findByEmail(email)
            .or(() -> repo.findByPhoneNumber(phone))
            .orElseGet(() -> {
                User u = new User();
                u.setFullName(name);
                u.setEmail(email);
                u.setRole(role);
                u.setPassword(encoder.encode(DEFAULT_PASSWORD));
                u.setLatitude(28.6139);
                u.setLongitude(77.2090);
                return u;
            });
        // Patch missing fields on existing users
        if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank()) {
            user.setPhoneNumber(phone);
        }
        if (user.getLatitude() == null) {
            user.setLatitude(28.6139);
            user.setLongitude(77.2090);
        }
        // Update name if it changed
        if (!name.equals(user.getFullName())) {
            user.setFullName(name);
        }
        return repo.save(user);
    }

    private Clinic seedClinic(ClinicRepository repo, Long ownerUserId) {
        Clinic clinic = repo.findByOwnerUserId(ownerUserId).stream().findFirst().orElseGet(() -> {
            Clinic c = new Clinic();
            c.setOwnerUserId(ownerUserId);
            return c;
        });
        // Always update to latest details
        clinic.setName("Care Plus Multi-Speciality Clinic");
        clinic.setAddress("A-12, Hauz Khas Enclave, New Delhi - 110016");
        clinic.setPhone("011-4123-5678");
        clinic.setLatitude(28.5494);   // Hauz Khas, Delhi
        clinic.setLongitude(77.2001);
        clinic.setApproved(true);
        return repo.save(clinic);
    }

    private void seedDoctorProfile(
        DoctorProfileRepository profileRepo,
        DoctorDegreeRepository degreeRepo,
        Long doctorUserId, Long clinicId,
        String specialization, String bio,
        int slotMinutes, String workStart, String workEnd,
        String roomId, int age, String gender, String occupation,
        String[] degreeNames, String[] institutes
    ) {
        DoctorProfile p = profileRepo.findByUserId(doctorUserId).orElseGet(() -> {
            DoctorProfile dp = new DoctorProfile();
            dp.setUserId(doctorUserId);
            return dp;
        });
        p.setClinicId(clinicId);
        p.setSpecialization(specialization);
        p.setBio(bio);
        p.setSlotDurationMinutes(slotMinutes);
        p.setWorkStart(workStart);
        p.setWorkEnd(workEnd);
        p.setRoomId(roomId);
        p.setAge(age);
        p.setGender(gender);
        p.setOccupation(occupation);
        p.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        profileRepo.save(p);

        // Recreate degrees
        degreeRepo.findByDoctorUserId(doctorUserId).forEach(degreeRepo::delete);
        for (int i = 0; i < degreeNames.length; i++) {
            DoctorDegree d = new DoctorDegree();
            d.setDoctorUserId(doctorUserId);
            d.setDegreeName(degreeNames[i]);
            d.setInstitute(i < institutes.length ? institutes[i] : "Certified Institution");
            d.setYearOfCompletion(2020 - i);
            degreeRepo.save(d);
        }
    }

    private void seedPatientProfile(PatientProfileRepository repo, Long patientUserId) {
        PatientProfile p = repo.findByUserId(patientUserId).orElseGet(() -> {
            PatientProfile pp = new PatientProfile();
            pp.setUserId(patientUserId);
            return pp;
        });
        p.setBloodGroup("O+");
        p.setAge(28);
        p.setGender("Male");
        p.setHeight(175.0);
        p.setWeight(72.0);
        p.setEmergencyContact("9876543210");
        repo.save(p);
    }
}
