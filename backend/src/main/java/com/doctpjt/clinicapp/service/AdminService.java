package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorDegree;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.Rating;
import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorDegreeRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.RatingRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import jakarta.transaction.Transactional;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final PatientProfileRepository patientProfileRepository;
    private final DoctorDegreeRepository doctorDegreeRepository;
    private final RatingRepository ratingRepository;

    public AdminService(
        UserRepository userRepository,
        ClinicRepository clinicRepository,
        AppointmentRepository appointmentRepository,
        VisitRecordRepository visitRecordRepository,
        DoctorProfileRepository doctorProfileRepository,
        PatientProfileRepository patientProfileRepository,
        DoctorDegreeRepository doctorDegreeRepository,
        RatingRepository ratingRepository
    ) {
        this.userRepository = userRepository;
        this.clinicRepository = clinicRepository;
        this.appointmentRepository = appointmentRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.patientProfileRepository = patientProfileRepository;
        this.doctorDegreeRepository = doctorDegreeRepository;
        this.ratingRepository = ratingRepository;
    }

    @Transactional
    public Map<String, Object> cleanupTestData(String emailDomain) {
        List<User> users = userRepository.findByEmailEndingWith(emailDomain);
        Set<Long> userIds = users.stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
        Set<Long> doctorUserIds = users.stream()
            .filter(u -> u.getRole() == Role.DOCTOR)
            .map(User::getId)
            .collect(java.util.stream.Collectors.toSet());
        Set<Long> patientUserIds = users.stream()
            .filter(u -> u.getRole() == Role.PATIENT)
            .map(User::getId)
            .collect(java.util.stream.Collectors.toSet());

        List<Clinic> clinicsToDelete = clinicRepository.findAll().stream()
            .filter(c -> c.getOwnerUserId() != null && userIds.contains(c.getOwnerUserId()))
            .toList();
        Set<Long> clinicIds = clinicsToDelete.stream().map(Clinic::getId).collect(java.util.stream.Collectors.toSet());

        List<DoctorProfile> doctorProfilesToDelete = doctorProfileRepository.findAll().stream()
            .filter(d -> d.getUserId() != null && doctorUserIds.contains(d.getUserId()))
            .toList();

        List<PatientProfile> patientProfilesToDelete = patientProfileRepository.findAll().stream()
            .filter(p -> p.getUserId() != null && patientUserIds.contains(p.getUserId()))
            .toList();

        List<DoctorDegree> degreesToDelete = doctorDegreeRepository.findAll().stream()
            .filter(d -> d.getDoctorUserId() != null && doctorUserIds.contains(d.getDoctorUserId()))
            .toList();

        List<Rating> ratingsToDelete = ratingRepository.findAll().stream()
            .filter(r -> (r.getDoctorUserId() != null && doctorUserIds.contains(r.getDoctorUserId()))
                || (r.getPatientUserId() != null && userIds.contains(r.getPatientUserId())))
            .toList();

        List<Appointment> appointmentsToDelete = appointmentRepository.findAll().stream()
            .filter(a -> (a.getDoctorUserId() != null && doctorUserIds.contains(a.getDoctorUserId()))
                || (a.getPatientUserId() != null && patientUserIds.contains(a.getPatientUserId()))
                || (a.getClinicId() != null && clinicIds.contains(a.getClinicId())))
            .toList();
        Set<Long> appointmentIds = appointmentsToDelete.stream().map(Appointment::getId).collect(java.util.stream.Collectors.toSet());

        List<VisitRecord> visitsToDelete = visitRecordRepository.findAll().stream()
            .filter(v -> (v.getAppointmentId() != null && appointmentIds.contains(v.getAppointmentId()))
                || (v.getDoctorUserId() != null && doctorUserIds.contains(v.getDoctorUserId()))
                || (v.getPatientUserId() != null && patientUserIds.contains(v.getPatientUserId())))
            .toList();

        // Delete in dependency-safe order.
        visitRecordRepository.deleteAllInBatch(visitsToDelete);
        appointmentRepository.deleteAllInBatch(appointmentsToDelete);
        ratingRepository.deleteAllInBatch(ratingsToDelete);
        doctorDegreeRepository.deleteAllInBatch(degreesToDelete);
        doctorProfileRepository.deleteAllInBatch(doctorProfilesToDelete);
        patientProfileRepository.deleteAllInBatch(patientProfilesToDelete);
        clinicRepository.deleteAllInBatch(clinicsToDelete);
        userRepository.deleteAllInBatch(users);

        return Map.of(
            "emailDomain", emailDomain,
            "deletedUsers", users.size(),
            "deletedClinics", clinicsToDelete.size(),
            "deletedDoctorProfiles", doctorProfilesToDelete.size(),
            "deletedPatientProfiles", patientProfilesToDelete.size(),
            "deletedDegrees", degreesToDelete.size(),
            "deletedRatings", ratingsToDelete.size(),
            "deletedAppointments", appointmentsToDelete.size(),
            "deletedVisits", visitsToDelete.size()
        );
    }
}
