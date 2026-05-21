package com.doctpjt.clinicapp;

import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorDegree;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorDegreeRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

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
        DoctorDegreeRepository doctorDegreeRepository,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            // Schema migrations — each in its own try/catch so one failure doesn't stop startup
            runSafe(jdbcTemplate, "ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");
            runSafe(jdbcTemplate, "ALTER TABLE appointments MODIFY COLUMN status VARCHAR(20) NOT NULL");

            // Seed test accounts — only creates if not already present
            User admin       = seedUser(userRepository, passwordEncoder, "admin@test.com",           "Head Admin",       Role.ADMIN,   "9100000000");
            User patient     = seedUser(userRepository, passwordEncoder, "patient@test.com",         "Rahul Verma",      Role.PATIENT, "9100000001");
            User clinicOwner = seedUser(userRepository, passwordEncoder, "clinic@careplus.in",       "Care Plus Admin",  Role.CLINIC,  "9100000003");
            User doctor1     = seedUser(userRepository, passwordEncoder, "priya.sharma@careplus.in", "Dr. Priya Sharma", Role.DOCTOR,  "9100000010");
            User doctor2     = seedUser(userRepository, passwordEncoder, "arjun.mehta@careplus.in",  "Dr. Arjun Mehta",  Role.DOCTOR,  "9100000011");

            // Seed clinic
            Clinic clinic = seedClinic(clinicRepository, clinicOwner.getId());

            // Seed doctor profiles
            seedDoctorProfile(doctorProfileRepository, doctorDegreeRepository,
                doctor1.getId(), clinic.getId(),
                "Cardiology", "Heart specialist with 12 years of experience in interventional cardiology.",
                20, "09:00", "17:00", "Room 201", 38, "Female", "Cardiologist",
                new String[]{"MBBS", "MD Cardiology", "DM Interventional Cardiology"},
                new String[]{"AIIMS Delhi", "PGI Chandigarh", "Medanta Gurugram"});

            seedDoctorProfile(doctorProfileRepository, doctorDegreeRepository,
                doctor2.getId(), clinic.getId(),
                "Dermatology", "Skin and hair care specialist. Expert in cosmetic dermatology and acne treatment.",
                30, "10:00", "18:00", "Room 105", 34, "Male", "Dermatologist",
                new String[]{"MBBS", "MD Dermatology"},
                new String[]{"Maulana Azad Medical College", "Safdarjung Hospital"});

            // Seed patient profile
            seedPatientProfile(patientProfileRepository, patient.getId());

            log.info("=== DocNest ready | password: {} for all test accounts ===", DEFAULT_PASSWORD);
            log.info("  ADMIN   {} / {}", admin.getPhoneNumber(), admin.getEmail());
            log.info("  PATIENT {} / {}", patient.getPhoneNumber(), patient.getEmail());
            log.info("  DOCTOR1 {} / {}", doctor1.getPhoneNumber(), doctor1.getEmail());
            log.info("  CLINIC  {} / {}", clinicOwner.getPhoneNumber(), clinicOwner.getEmail());
        };
    }

    private void runSafe(JdbcTemplate jdbc, String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.warn("Schema migration skipped ({}): {}", sql.substring(0, Math.min(50, sql.length())), e.getMessage());
        }
    }

    private User seedUser(UserRepository repo, PasswordEncoder encoder, String email, String name, Role role, String phone) {
        try {
            return repo.findByEmail(email)
                .or(() -> repo.findByPhoneNumber(phone))
                .orElseGet(() -> {
                    User u = new User();
                    u.setFullName(name);
                    u.setEmail(email);
                    u.setRole(role);
                    u.setPassword(encoder.encode(DEFAULT_PASSWORD));
                    u.setPhoneNumber(phone);
                    u.setLatitude(28.6139);
                    u.setLongitude(77.2090);
                    return repo.save(u);
                });
        } catch (Exception e) {
            log.warn("Could not seed user {}: {}", email, e.getMessage());
            return repo.findByEmail(email).orElseThrow();
        }
    }

    private Clinic seedClinic(ClinicRepository repo, Long ownerUserId) {
        try {
            return repo.findByOwnerUserId(ownerUserId).stream().findFirst().orElseGet(() -> {
                Clinic c = new Clinic();
                c.setOwnerUserId(ownerUserId);
                c.setName("Care Plus Multi-Speciality Clinic");
                c.setAddress("A-12, Hauz Khas Enclave, New Delhi - 110016");
                c.setPhone("011-4123-5678");
                c.setLatitude(28.5494);
                c.setLongitude(77.2001);
                c.setApproved(true);
                return repo.save(c);
            });
        } catch (Exception e) {
            log.warn("Could not seed clinic: {}", e.getMessage());
            return repo.findByOwnerUserId(ownerUserId).stream().findFirst().orElseThrow();
        }
    }

    private void seedDoctorProfile(
        DoctorProfileRepository profileRepo, DoctorDegreeRepository degreeRepo,
        Long doctorUserId, Long clinicId,
        String specialization, String bio,
        int slotMinutes, String workStart, String workEnd,
        String roomId, int age, String gender, String occupation,
        String[] degreeNames, String[] institutes
    ) {
        try {
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

            if (degreeRepo.findByDoctorUserId(doctorUserId).isEmpty()) {
                for (int i = 0; i < degreeNames.length; i++) {
                    DoctorDegree d = new DoctorDegree();
                    d.setDoctorUserId(doctorUserId);
                    d.setDegreeName(degreeNames[i]);
                    d.setInstitute(i < institutes.length ? institutes[i] : "Certified Institution");
                    d.setYearOfCompletion(2020 - i);
                    degreeRepo.save(d);
                }
            }
        } catch (Exception e) {
            log.warn("Could not seed doctor profile for userId={}: {}", doctorUserId, e.getMessage());
        }
    }

    private void seedPatientProfile(PatientProfileRepository repo, Long patientUserId) {
        try {
            PatientProfile p = repo.findByUserId(patientUserId).orElseGet(() -> {
                PatientProfile pp = new PatientProfile();
                pp.setUserId(patientUserId);
                return pp;
            });
            if (p.getBloodGroup() == null) {
                p.setBloodGroup("O+");
                p.setAge(28);
                p.setGender("Male");
                p.setHeight(175.0);
                p.setWeight(72.0);
                repo.save(p);
            }
        } catch (Exception e) {
            log.warn("Could not seed patient profile: {}", e.getMessage());
        }
    }
}
