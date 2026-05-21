package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.AnalyticsDtos.ClinicAnalyticsResponse;
import com.doctpjt.clinicapp.dto.AnalyticsDtos.MonthlyCount;
import com.doctpjt.clinicapp.dto.AnalyticsDtos.MonthlyRevenue;
import com.doctpjt.clinicapp.dto.AnalyticsDtos.StatusBreakdown;
import com.doctpjt.clinicapp.dto.AnalyticsDtos.TopDoctorResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicCreateRequest;
import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicPatientResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicDoctorResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorCardResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorUpdateByClinicRequest;
import com.doctpjt.clinicapp.dto.WorkspaceDtos.ClinicDashboardResponse;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorDegree;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.Rating;
import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.DoctorDegreeRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.RatingRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorRegisterByClinicRequest;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Service
public class ClinicService {

    private final ClinicRepository clinicRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final UserRepository userRepository;
    private final DoctorDegreeRepository doctorDegreeRepository;
    private final RatingRepository ratingRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final PasswordEncoder passwordEncoder;

    public ClinicService(
        ClinicRepository clinicRepository,
        DoctorProfileRepository doctorProfileRepository,
        UserRepository userRepository,
        DoctorDegreeRepository doctorDegreeRepository,
        RatingRepository ratingRepository,
        AppointmentRepository appointmentRepository,
        VisitRecordRepository visitRecordRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.clinicRepository = clinicRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.userRepository = userRepository;
        this.doctorDegreeRepository = doctorDegreeRepository;
        this.ratingRepository = ratingRepository;
        this.appointmentRepository = appointmentRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @CacheEvict(value = {"nearbyDoctors", "clinicDashboard"}, allEntries = true)
    public Clinic createClinic(ClinicCreateRequest request) {
        Clinic clinic = new Clinic();
        clinic.setName(request.name());
        clinic.setAddress(request.address());
        clinic.setPhone(request.phone());
        clinic.setLatitude(request.latitude());
        clinic.setLongitude(request.longitude());
        clinic.setOwnerUserId(request.ownerUserId());
        return clinicRepository.save(clinic);
    }

    public List<Clinic> getClinicsByOwner(Long ownerUserId) {
        return clinicRepository.findByOwnerUserId(ownerUserId);
    }

    public boolean isClinicOwnedBy(Long clinicId, Long ownerUserId) {
        return clinicRepository.findById(clinicId)
            .map(clinic -> ownerUserId != null && ownerUserId.equals(clinic.getOwnerUserId()))
            .orElse(false);
    }

    @CacheEvict(value = {"nearbyDoctors", "clinicDashboard"}, allEntries = true)
    public Clinic updateClinic(Long id, Clinic request) {
        Clinic clinic = clinicRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));
        
        clinic.setName(request.getName());
        clinic.setAddress(request.getAddress());
        clinic.setPhone(request.getPhone());
        clinic.setLatitude(request.getLatitude());
        clinic.setLongitude(request.getLongitude());
        clinic.setAbout(request.getAbout());
        clinic.setHelpline(request.getHelpline());
        clinic.setEmail(request.getEmail());
        clinic.setWebsite(request.getWebsite());
        clinic.setGoogleMapsUrl(request.getGoogleMapsUrl());
        clinic.setPhotos(request.getPhotos());
        clinic.setOpeningHours(request.getOpeningHours());
        clinic.setServices(request.getServices());
        clinic.setApproved(false); // Reset approval on update
        
        return clinicRepository.save(clinic);
    }

    @Cacheable(value = "nearbyDoctors", key = "#userLat + ',' + #userLng")
    public List<DoctorCardResponse> getNearbyDoctors(double userLat, double userLng) {
        List<DoctorProfile> profiles = doctorProfileRepository.findAll();
        
        List<Long> userIds = profiles.stream().map(DoctorProfile::getUserId).toList();
        List<Long> clinicIds = profiles.stream().map(DoctorProfile::getClinicId).toList();

        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        
        Map<Long, Clinic> clinicMap = clinicRepository.findAllById(clinicIds).stream()
            .collect(Collectors.toMap(Clinic::getId, c -> c));

        Map<Long, List<DoctorDegree>> degreeMap = doctorDegreeRepository.findByDoctorUserIdIn(userIds).stream()
            .collect(Collectors.groupingBy(DoctorDegree::getDoctorUserId));

        Map<Long, List<Rating>> ratingMap = ratingRepository.findByDoctorUserIdIn(userIds).stream()
            .collect(Collectors.groupingBy(Rating::getDoctorUserId));

        return profiles.stream()
            .map(profile -> {
                User user = userMap.get(profile.getUserId());
                if (user == null || user.getRole() != Role.DOCTOR || profile.getApprovalStatus() != DoctorApprovalStatus.ACTIVE) return null;

                Clinic clinic = clinicMap.get(profile.getClinicId());
                if (clinic == null || !clinic.isApproved() || clinic.getLatitude() == null || clinic.getLongitude() == null) return null;

                double distance = haversineKm(userLat, userLng, clinic.getLatitude(), clinic.getLongitude());
                
                List<String> degrees = degreeMap.getOrDefault(user.getId(), List.of()).stream()
                    .map(d -> d.getDegreeName() + " - " + d.getInstitute())
                    .toList();

                List<Rating> ratings = ratingMap.getOrDefault(user.getId(), List.of());
                double avgRating = ratings.isEmpty()
                    ? 0.0
                    : ratings.stream().mapToInt(Rating::getScore).average().orElse(0.0);

                return new DoctorCardResponse(
                    user.getId(),
                    clinic.getId(),
                    user.getFullName(),
                    profile.getSpecialization(),
                    profile.getBio(),
                    profile.getRoomId(),
                    profile.getAge(),
                    profile.getGender(),
                    profile.getOccupation(),
                    clinic.getName(),
                    clinic.getAddress(),
                    Math.round(distance * 100.0) / 100.0,
                    degrees,
                    Math.round(avgRating * 100.0) / 100.0,
                    clinic.getAbout(),
                    clinic.getHelpline(),
                    clinic.getEmail(),
                    clinic.getWebsite(),
                    clinic.getGoogleMapsUrl(),
                    clinic.getPhotos(),
                    clinic.getOpeningHours(),
                    clinic.getServices(),
                    clinic.getPhone()
                );
            })
            .filter(card -> card != null)
            .sorted(Comparator.comparingDouble(DoctorCardResponse::distanceKm))
            .collect(Collectors.toList());
    }

    public List<ClinicDoctorResponse> getClinicDoctors(Long clinicId) {
        List<DoctorProfile> profiles = doctorProfileRepository.findByClinicId(clinicId);
        List<Long> userIds = profiles.stream().map(DoctorProfile::getUserId).toList();

        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, List<DoctorDegree>> degreeMap = doctorDegreeRepository.findByDoctorUserIdIn(userIds).stream()
            .collect(Collectors.groupingBy(DoctorDegree::getDoctorUserId));

        return profiles.stream().map(p -> {
            User u = userMap.get(p.getUserId());
            List<String> degrees = degreeMap.getOrDefault(p.getUserId(), List.of()).stream()
                .map(d -> d.getDegreeName() + " - " + d.getInstitute())
                .toList();

            List<Appointment> doctorAppointments = appointmentRepository.findByDoctorUserId(p.getUserId());
            List<Appointment> upcomingAppointments = doctorAppointments.stream()
                .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getStartTime() != null && a.getStartTime().isAfter(LocalDateTime.now()))
                .sorted(Comparator.comparing(Appointment::getStartTime))
                .toList();
            Optional<Appointment> nextAppointment = upcomingAppointments.stream().findFirst();
            Optional<Appointment> lastAppointment = doctorAppointments.stream()
                .filter(a -> a.getStartTime() != null)
                .sorted(Comparator.comparing(Appointment::getStartTime).reversed())
                .findFirst();

            String lastPatientName = null;
            LocalDateTime lastVisitTime = null;
            if (lastAppointment.isPresent()) {
                Optional<VisitRecord> lastVisit = visitRecordRepository.findByAppointmentIdIn(List.of(lastAppointment.get().getId())).stream().findFirst();
                if (lastVisit.isPresent()) {
                    lastVisitTime = lastVisit.get().getVisitDate() != null ? lastVisit.get().getVisitDate().atStartOfDay() : null;
                    lastPatientName = userRepository.findById(lastVisit.get().getPatientUserId()).map(User::getFullName).orElse(null);
                } else {
                    lastPatientName = userRepository.findById(lastAppointment.get().getPatientUserId()).map(User::getFullName).orElse(null);
                }
            }

            return new ClinicDoctorResponse(
                p.getUserId(),
                u != null ? u.getFullName() : "Unknown",
                p.getSpecialization(),
                p.getRoomId(),
                p.getAge(),
                p.getGender(),
                p.getOccupation(),
                degrees,
                p.getApprovalStatus() != null ? p.getApprovalStatus().name() : DoctorApprovalStatus.ACTIVE.name(),
                upcomingAppointments.size(),
                nextAppointment.map(Appointment::getStartTime).orElse(null),
                lastPatientName,
                lastVisitTime
            );
        }).toList();
    }

    @Cacheable(value = "doctorProfile", key = "#doctorUserId")
    public DoctorCardResponse getDoctorDetail(Long doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(doctorUserId)
            .filter(doctorProfile -> doctorProfile.getApprovalStatus() == DoctorApprovalStatus.ACTIVE)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));

        User user = userRepository.findById(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Clinic clinic = clinicRepository.findById(profile.getClinicId()).orElse(null);

        List<String> degrees = doctorDegreeRepository.findByDoctorUserId(doctorUserId).stream()
            .map(d -> d.getDegreeName() + " - " + d.getInstitute())
            .toList();

        List<Rating> ratings = ratingRepository.findByDoctorUserId(doctorUserId);
        double avgRating = ratings.isEmpty()
            ? 0.0
            : ratings.stream().mapToInt(Rating::getScore).average().orElse(0.0);

        return new DoctorCardResponse(
            user.getId(),
            clinic != null ? clinic.getId() : null,
            user.getFullName(),
            profile.getSpecialization(),
            profile.getBio(),
            profile.getRoomId(),
            profile.getAge(),
            profile.getGender(),
            profile.getOccupation(),
            clinic != null ? clinic.getName() : "Independent",
            clinic != null ? clinic.getAddress() : "N/A",
            null, // distance not applicable for single lookup without user coords
            degrees,
            Math.round(avgRating * 100.0) / 100.0,
            clinic != null ? clinic.getAbout() : null,
            clinic != null ? clinic.getHelpline() : null,
            clinic != null ? clinic.getEmail() : null,
            clinic != null ? clinic.getWebsite() : null,
            clinic != null ? clinic.getGoogleMapsUrl() : null,
            clinic != null ? clinic.getPhotos() : null,
            clinic != null ? clinic.getOpeningHours() : null,
            clinic != null ? clinic.getServices() : null,
            clinic != null ? clinic.getPhone() : null
        );
    }

    public List<DoctorCardResponse> searchDoctors(String query) {
        List<DoctorProfile> profiles = doctorProfileRepository.searchByNameOrSpecialization(query);

        // Limit to 20 results for performance
        if (profiles.size() > 20) {
            profiles = profiles.subList(0, 20);
        }

        List<Long> userIds = profiles.stream().map(DoctorProfile::getUserId).toList();
        List<Long> clinicIds = profiles.stream().map(DoctorProfile::getClinicId).filter(id -> id != null).toList();

        Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, Clinic> clinicMap = clinicRepository.findAllById(clinicIds).stream()
            .collect(Collectors.toMap(Clinic::getId, c -> c));

        Map<Long, List<DoctorDegree>> degreeMap = doctorDegreeRepository.findByDoctorUserIdIn(userIds).stream()
            .collect(Collectors.groupingBy(DoctorDegree::getDoctorUserId));

        Map<Long, List<Rating>> ratingMap = ratingRepository.findByDoctorUserIdIn(userIds).stream()
            .collect(Collectors.groupingBy(Rating::getDoctorUserId));

        return profiles.stream()
            .map(profile -> {
                User user = userMap.get(profile.getUserId());
                if (user == null) return null;

                Clinic clinic = clinicMap.get(profile.getClinicId());

                List<String> degrees = degreeMap.getOrDefault(user.getId(), List.of()).stream()
                    .map(d -> d.getDegreeName() + " - " + d.getInstitute())
                    .toList();

                List<Rating> ratings = ratingMap.getOrDefault(user.getId(), List.of());
                double avgRating = ratings.isEmpty()
                    ? 0.0
                    : ratings.stream().mapToInt(Rating::getScore).average().orElse(0.0);

                return new DoctorCardResponse(
                    user.getId(),
                    clinic != null ? clinic.getId() : null,
                    user.getFullName(),
                    profile.getSpecialization(),
                    profile.getBio(),
                    profile.getRoomId(),
                    profile.getAge(),
                    profile.getGender(),
                    profile.getOccupation(),
                    clinic != null ? clinic.getName() : "Independent",
                    clinic != null ? clinic.getAddress() : "N/A",
                    null,
                    degrees,
                    Math.round(avgRating * 100.0) / 100.0,
                    clinic != null ? clinic.getAbout() : null,
                    clinic != null ? clinic.getHelpline() : null,
                    clinic != null ? clinic.getEmail() : null,
                    clinic != null ? clinic.getWebsite() : null,
                    clinic != null ? clinic.getGoogleMapsUrl() : null,
                    clinic != null ? clinic.getPhotos() : null,
                    clinic != null ? clinic.getOpeningHours() : null,
                    clinic != null ? clinic.getServices() : null,
                    clinic != null ? clinic.getPhone() : null
                );
            })
            .filter(card -> card != null)
            .collect(Collectors.toList());
    }

    @Cacheable(value = "clinicDashboard", key = "#clinicId")
    public ClinicDashboardResponse getClinicDashboard(Long clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));

        List<ClinicDoctorResponse> doctors = getClinicDoctors(clinicId);
        List<Appointment> appointments = appointmentRepository.findByClinicId(clinicId);

        Map<Long, List<Appointment>> appointmentsByPatient = appointments.stream()
            .filter(a -> a.getPatientUserId() != null)
            .collect(Collectors.groupingBy(Appointment::getPatientUserId));

        Map<Long, VisitRecord> latestVisitByPatient = new HashMap<>();
        List<Long> appointmentIds = appointments.stream().map(Appointment::getId).toList();
        List<VisitRecord> allVisitsQuery = new ArrayList<>();
        if (!appointmentIds.isEmpty()) {
            allVisitsQuery = visitRecordRepository.findByAppointmentIdIn(appointmentIds);
            allVisitsQuery.forEach(visit -> {
                VisitRecord existing = latestVisitByPatient.get(visit.getPatientUserId());
                if (existing == null || (visit.getVisitDate() != null && existing.getVisitDate() != null && visit.getVisitDate().isAfter(existing.getVisitDate()))) {
                    latestVisitByPatient.put(visit.getPatientUserId(), visit);
                }
            });
        }

        List<ClinicPatientResponse> patients = appointmentsByPatient.entrySet().stream()
            .map(entry -> {
                Long patientUserId = entry.getKey();
                List<Appointment> patientAppointments = entry.getValue();
                Optional<Appointment> nextAppointment = patientAppointments.stream()
                    .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getStartTime() != null && a.getStartTime().isAfter(LocalDateTime.now()))
                    .sorted(Comparator.comparing(Appointment::getStartTime))
                    .findFirst();
                VisitRecord lastVisit = latestVisitByPatient.get(patientUserId);
                User patient = userRepository.findById(patientUserId).orElse(null);
                String doctorName = null;
                LocalDateTime lastVisitTime = null;
                if (lastVisit != null) {
                    doctorName = userRepository.findById(lastVisit.getDoctorUserId()).map(User::getFullName).orElse(null);
                    lastVisitTime = lastVisit.getVisitDate() != null ? lastVisit.getVisitDate().atStartOfDay() : null;
                }

                return new ClinicPatientResponse(
                    patientUserId,
                    patient != null ? patient.getFullName() : "Unknown",
                    patient != null ? patient.getEmail() : null,
                    patient != null ? patient.getPhoneNumber() : null,
                    patientAppointments.size(),
                    (int) patientAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getStartTime() != null && a.getStartTime().isAfter(LocalDateTime.now())).count(),
                    nextAppointment.map(Appointment::getStartTime).orElse(null),
                    doctorName,
                    lastVisitTime,
                    true
                );
            })
            .sorted(Comparator.comparing(ClinicPatientResponse::nextAppointmentTime, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();

        List<com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse> upcomingAppointments = appointments.stream()
            .filter(a -> a.getStatus() == AppointmentStatus.BOOKED && a.getStartTime() != null && a.getStartTime().isAfter(LocalDateTime.now()))
            .sorted(Comparator.comparing(Appointment::getStartTime))
            .map(a -> new com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse(
                a.getId(), a.getDoctorUserId(), a.getPatientUserId(), a.getClinicId(),
                a.getTokenNumber(), a.getCheckInCode(), a.getStartTime(), a.getEndTime(), a.getStatus() != null ? a.getStatus().name() : "PENDING",
                a.isReviewed(), a.getAttendedConfirmed()
            ))
            .toList();

        List<com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse> allAppointments = appointments.stream()
            .map(a -> new com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse(
                a.getId(), a.getDoctorUserId(), a.getPatientUserId(), a.getClinicId(),
                a.getTokenNumber(), a.getCheckInCode(), a.getStartTime(), a.getEndTime(), a.getStatus() != null ? a.getStatus().name() : "PENDING",
                a.isReviewed(), a.getAttendedConfirmed()
            ))
            .toList();

        List<com.doctpjt.clinicapp.dto.VisitDtos.VisitResponse> allVisits = allVisitsQuery.stream()
            .map(v -> new com.doctpjt.clinicapp.dto.VisitDtos.VisitResponse(
                v.getId(), v.getAppointmentId(), v.getDoctorUserId(), v.getPatientUserId(),
                v.getVisitDate(), v.getDiagnosis(), v.getDiseaseHistory(), v.getMedications(),
                v.getRevisitDate(), v.getPrescriptionPhotoUrl()
            ))
            .toList();

        return new ClinicDashboardResponse(clinic.getId(), clinic.getName(), clinic.isApproved(), doctors, patients, upcomingAppointments, allAppointments, allVisits);
    }

    public ClinicDoctorResponse registerDoctorByClinic(Long clinicId, DoctorRegisterByClinicRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        User user = new User();
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName());
        user.setRole(Role.DOCTOR);
        User savedUser = userRepository.save(user);

        DoctorProfile profile = new DoctorProfile();
        profile.setUserId(savedUser.getId());
        profile.setClinicId(clinicId);
        profile.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        profile.setSpecialization(request.specialization());
        profile.setBio(request.bio());
        profile.setRoomId(request.roomId());
        profile.setAge(request.age());
        profile.setGender(request.gender());
        profile.setOccupation(request.occupation());
        profile.setWorkStart(request.workStart() != null ? request.workStart() : "09:00");
        profile.setWorkEnd(request.workEnd() != null ? request.workEnd() : "17:00");
        profile.setSlotDurationMinutes(request.slotDurationMinutes() != null ? request.slotDurationMinutes() : 20);
        doctorProfileRepository.save(profile);

        if (request.degrees() != null) {
            for (String degreeStr : request.degrees()) {
                DoctorDegree degree = new DoctorDegree();
                degree.setDoctorUserId(savedUser.getId());
                degree.setDegreeName(degreeStr.split("-")[0].trim());
                if (degreeStr.contains("-")) {
                    degree.setInstitute(degreeStr.split("-")[1].trim());
                } else {
                    degree.setInstitute("Certified Institution");
                }
                degree.setYearOfCompletion(java.time.LocalDate.now().getYear());
                doctorDegreeRepository.save(degree);
            }
        }

        return new ClinicDoctorResponse(
            savedUser.getId(),
            savedUser.getFullName(),
            profile.getSpecialization(),
            profile.getRoomId(),
            profile.getAge(),
            profile.getGender(),
            profile.getOccupation(),
            request.degrees(),
            profile.getApprovalStatus().name(),
            0,
            null,
            null,
            null
        );
    }

    public ClinicDoctorResponse approveDoctorProfile(Long clinicId, Long doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        if (profile.getClinicId() == null || !profile.getClinicId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }
        profile.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        doctorProfileRepository.save(profile);
        return getClinicDoctors(clinicId).stream()
            .filter(doctor -> doctor.doctorUserId().equals(doctorUserId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
    }

    public void removeDoctorFromClinic(Long clinicId, Long doctorUserId) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        if (profile.getClinicId() == null || !profile.getClinicId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }
        profile.setClinicId(null);
        profile.setApprovalStatus(DoctorApprovalStatus.PENDING_REVIEW);
        doctorProfileRepository.save(profile);
    }

    public ClinicDoctorResponse updateDoctorByClinic(Long clinicId, Long doctorUserId, DoctorUpdateByClinicRequest request) {
        DoctorProfile profile = doctorProfileRepository.findByUserId(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("Doctor profile not found"));
        if (profile.getClinicId() == null || !profile.getClinicId().equals(clinicId)) {
            throw new IllegalArgumentException("Doctor does not belong to this clinic");
        }

        User user = userRepository.findById(doctorUserId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setFullName(request.fullName());
        userRepository.save(user);

        profile.setSpecialization(request.specialization());
        profile.setBio(request.bio());
        profile.setRoomId(request.roomId());
        profile.setAge(request.age());
        profile.setGender(request.gender());
        profile.setOccupation(request.occupation());
        profile.setWorkStart(request.workStart() != null ? request.workStart() : profile.getWorkStart());
        profile.setWorkEnd(request.workEnd() != null ? request.workEnd() : profile.getWorkEnd());
        profile.setSlotDurationMinutes(request.slotDurationMinutes() != null ? request.slotDurationMinutes() : profile.getSlotDurationMinutes());
        profile.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        doctorProfileRepository.save(profile);

        doctorDegreeRepository.findByDoctorUserId(doctorUserId).forEach(doctorDegreeRepository::delete);
        if (request.degrees() != null) {
            for (String degreeStr : request.degrees()) {
                DoctorDegree degree = new DoctorDegree();
                degree.setDoctorUserId(doctorUserId);
                degree.setDegreeName(degreeStr.split("-")[0].trim());
                degree.setInstitute(degreeStr.contains("-") ? degreeStr.split("-")[1].trim() : "Certified Institution");
                degree.setYearOfCompletion(java.time.LocalDate.now().getYear());
                doctorDegreeRepository.save(degree);
            }
        }

        return getClinicDoctors(clinicId).stream()
            .filter(doctor -> doctor.doctorUserId().equals(doctorUserId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
    }

    public ClinicAnalyticsResponse getClinicAnalytics(Long clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
            .orElseThrow(() -> new IllegalArgumentException("Clinic not found"));

        List<Appointment> allAppointments = appointmentRepository.findByClinicId(clinicId);
        List<DoctorProfile> doctorProfiles = doctorProfileRepository.findByClinicId(clinicId);
        List<Long> doctorUserIds = doctorProfiles.stream().map(DoctorProfile::getUserId).toList();

        // Monthly visits for last 12 months
        YearMonth now = YearMonth.now();
        List<MonthlyCount> monthlyVisits = new ArrayList<>();
        List<MonthlyRevenue> monthlyRevenue = new ArrayList<>();

        // Default consultation fee (no fee field on entity, use a fixed rate)
        double consultationFee = 500.0;

        for (int i = 11; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

            long visitCount = allAppointments.stream()
                .filter(a -> a.getStartTime() != null
                    && !a.getStartTime().isBefore(start)
                    && !a.getStartTime().isAfter(end)
                    && (a.getStatus() == AppointmentStatus.COMPLETED || a.getStatus() == AppointmentStatus.ATTENDED))
                .count();

            monthlyVisits.add(new MonthlyCount(ym.getMonthValue(), ym.getYear(), visitCount));
            monthlyRevenue.add(new MonthlyRevenue(ym.getMonthValue(), ym.getYear(), visitCount * consultationFee));
        }

        // Total unique patients
        long totalPatients = allAppointments.stream()
            .map(Appointment::getPatientUserId)
            .filter(id -> id != null)
            .distinct()
            .count();

        // Total appointments
        long totalAppointments = allAppointments.size();

        // Average rating of clinic's doctors
        List<Rating> allRatings = doctorUserIds.isEmpty()
            ? List.of()
            : ratingRepository.findByDoctorUserIdIn(doctorUserIds);
        double averageRating = allRatings.isEmpty()
            ? 0.0
            : Math.round(allRatings.stream().mapToInt(Rating::getScore).average().orElse(0.0) * 100.0) / 100.0;

        // Top performing doctors by appointment count
        Map<Long, User> userMap = doctorUserIds.isEmpty()
            ? Map.of()
            : userRepository.findAllById(doctorUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        Map<Long, List<Rating>> ratingsByDoctor = allRatings.stream()
            .collect(Collectors.groupingBy(Rating::getDoctorUserId));

        List<TopDoctorResponse> topDoctors = doctorProfiles.stream()
            .map(profile -> {
                long apptCount = allAppointments.stream()
                    .filter(a -> profile.getUserId().equals(a.getDoctorUserId()))
                    .count();
                User user = userMap.get(profile.getUserId());
                List<Rating> docRatings = ratingsByDoctor.getOrDefault(profile.getUserId(), List.of());
                double docAvgRating = docRatings.isEmpty()
                    ? 0.0
                    : Math.round(docRatings.stream().mapToInt(Rating::getScore).average().orElse(0.0) * 100.0) / 100.0;

                return new TopDoctorResponse(
                    profile.getUserId(),
                    user != null ? user.getFullName() : "Unknown",
                    profile.getSpecialization(),
                    apptCount,
                    docAvgRating
                );
            })
            .sorted(Comparator.comparingLong(TopDoctorResponse::appointmentCount).reversed())
            .toList();

        // Status breakdown
        long completed = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long cancelled = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.CANCELLED).count();
        long missed = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.MISSED).count();
        long booked = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.BOOKED).count();
        long attended = allAppointments.stream().filter(a -> a.getStatus() == AppointmentStatus.ATTENDED).count();
        long total = totalAppointments > 0 ? totalAppointments : 1; // avoid division by zero

        StatusBreakdown statusBreakdown = new StatusBreakdown(
            completed, cancelled, missed, booked, attended, totalAppointments,
            Math.round((completed * 100.0 / total) * 10.0) / 10.0,
            Math.round((cancelled * 100.0 / total) * 10.0) / 10.0,
            Math.round((missed * 100.0 / total) * 10.0) / 10.0
        );

        // This month's numbers
        YearMonth thisMonth = YearMonth.now();
        long thisMonthVisits = monthlyVisits.isEmpty() ? 0 : monthlyVisits.get(monthlyVisits.size() - 1).count();
        double thisMonthRev = monthlyRevenue.isEmpty() ? 0.0 : monthlyRevenue.get(monthlyRevenue.size() - 1).revenue();

        return new ClinicAnalyticsResponse(
            monthlyVisits,
            monthlyRevenue,
            totalPatients,
            totalAppointments,
            averageRating,
            topDoctors,
            statusBreakdown,
            thisMonthVisits,
            thisMonthRev
        );
    }

    public List<com.doctpjt.clinicapp.dto.ClinicDtos.PatientSearchResult> searchPatients(Long clinicId, String name, String phone) {
        List<Appointment> clinicAppointments = appointmentRepository.findByClinicId(clinicId);

        // Get unique patient IDs from clinic appointments
        List<Long> patientUserIds = clinicAppointments.stream()
            .map(Appointment::getPatientUserId)
            .filter(id -> id != null)
            .distinct()
            .toList();

        if (patientUserIds.isEmpty()) return List.of();

        Map<Long, User> userMap = userRepository.findAllById(patientUserIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        // Filter by name and/or phone
        List<Long> matchedIds = patientUserIds.stream()
            .filter(id -> {
                User u = userMap.get(id);
                if (u == null) return false;
                boolean nameMatch = true;
                boolean phoneMatch = true;
                if (name != null && !name.isBlank()) {
                    nameMatch = u.getFullName() != null && u.getFullName().toLowerCase().contains(name.toLowerCase());
                }
                if (phone != null && !phone.isBlank()) {
                    phoneMatch = u.getPhoneNumber() != null && u.getPhoneNumber().contains(phone);
                }
                return nameMatch && phoneMatch;
            })
            .toList();

        if (matchedIds.isEmpty()) return List.of();

        // Get today's token numbers
        java.time.LocalDate today = java.time.LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(23, 59, 59);

        Map<Long, String> todayTokens = clinicAppointments.stream()
            .filter(a -> a.getStartTime() != null
                && !a.getStartTime().isBefore(todayStart)
                && !a.getStartTime().isAfter(todayEnd)
                && a.getStatus() == AppointmentStatus.BOOKED)
            .collect(Collectors.toMap(
                Appointment::getPatientUserId,
                a -> a.getTokenNumber() != null ? a.getTokenNumber() : "—",
                (a, b) -> a // if multiple tokens, take first
            ));

        // Get latest visit info per patient
        List<Long> allApptIds = clinicAppointments.stream().map(Appointment::getId).toList();
        List<VisitRecord> allVisits = allApptIds.isEmpty() ? List.of() : visitRecordRepository.findByAppointmentIdIn(allApptIds);
        Map<Long, VisitRecord> latestVisitByPatient = new HashMap<>();
        allVisits.forEach(v -> {
            VisitRecord existing = latestVisitByPatient.get(v.getPatientUserId());
            if (existing == null || (v.getVisitDate() != null && existing.getVisitDate() != null && v.getVisitDate().isAfter(existing.getVisitDate()))) {
                latestVisitByPatient.put(v.getPatientUserId(), v);
            }
        });

        // Count appointments per patient
        Map<Long, Long> apptCountByPatient = clinicAppointments.stream()
            .filter(a -> a.getPatientUserId() != null)
            .collect(Collectors.groupingBy(Appointment::getPatientUserId, Collectors.counting()));

        return matchedIds.stream().map(id -> {
            User u = userMap.get(id);
            VisitRecord lastVisit = latestVisitByPatient.get(id);
            String lastDoctorName = null;
            LocalDateTime lastVisitTime = null;
            if (lastVisit != null) {
                lastDoctorName = userRepository.findById(lastVisit.getDoctorUserId()).map(User::getFullName).orElse(null);
                lastVisitTime = lastVisit.getVisitDate() != null ? lastVisit.getVisitDate().atStartOfDay() : null;
            }
            return new com.doctpjt.clinicapp.dto.ClinicDtos.PatientSearchResult(
                id,
                u.getFullName(),
                u.getPhoneNumber(),
                todayTokens.getOrDefault(id, null),
                lastVisitTime,
                lastDoctorName,
                apptCountByPatient.getOrDefault(id, 0L).intValue()
            );
        }).toList();
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double radius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return radius * c;
    }
}
