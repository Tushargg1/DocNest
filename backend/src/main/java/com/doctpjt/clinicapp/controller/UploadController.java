package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.service.CloudinaryService;
import com.doctpjt.clinicapp.service.PrescriptionOCRService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final CloudinaryService cloudinaryService;
    private final PrescriptionOCRService prescriptionOCRService;
    private final UserRepository userRepository;
    private final DoctorProfileRepository doctorProfileRepository;
    private final ClinicRepository clinicRepository;

    public UploadController(CloudinaryService cloudinaryService, PrescriptionOCRService prescriptionOCRService,
                            UserRepository userRepository, DoctorProfileRepository doctorProfileRepository,
                            ClinicRepository clinicRepository) {
        this.cloudinaryService = cloudinaryService;
        this.prescriptionOCRService = prescriptionOCRService;
        this.userRepository = userRepository;
        this.doctorProfileRepository = doctorProfileRepository;
        this.clinicRepository = clinicRepository;
    }

    /**
     * Upload prescription image.
     */
    @PostMapping("/prescription/{visitId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    public Map<String, Object> uploadPrescription(
        @PathVariable Long visitId,
        @RequestParam("file") MultipartFile file,
        Authentication authentication
    ) {
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElseThrow();
        return prescriptionOCRService.processPrescription(
            file, visitId, userId, user.getFullName(), user.getPhoneNumber()
        );
    }

    /**
     * Upload multiple clinic photos (up to 5) and save to clinic entity.
     */
    @PostMapping("/clinic-photos")
    @PreAuthorize("hasAnyRole('CLINIC', 'ADMIN')")
    public Map<String, Object> uploadClinicPhotos(
        @RequestParam("files") MultipartFile[] files,
        @RequestParam String clinicName,
        @RequestParam(required = false) Long clinicId,
        Authentication authentication
    ) {
        if (!cloudinaryService.isConfigured()) {
            throw new IllegalStateException("Image upload service is not configured.");
        }

        List<String> urls = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (int i = 0; i < Math.min(files.length, 5); i++) {
            try {
                String url = cloudinaryService.uploadClinicPhoto(files[i], clinicName, "photo_" + (i + 1));
                urls.add(url);
            } catch (Exception e) {
                errors.add("File " + (i + 1) + ": " + e.getMessage());
            }
        }

        // Save URLs to clinic entity
        if (!urls.isEmpty()) {
            Long userId = (Long) authentication.getPrincipal();
            Clinic clinic = null;
            if (clinicId != null) {
                clinic = clinicRepository.findById(clinicId).orElse(null);
            }
            if (clinic == null) {
                clinic = clinicRepository.findByOwnerUserId(userId).stream().findFirst().orElse(null);
            }
            if (clinic != null) {
                try {
                    // Merge with existing photos
                    List<String> existing = new ArrayList<>();
                    if (clinic.getPhotos() != null && !clinic.getPhotos().isBlank()) {
                        existing = new ArrayList<>(List.of(MAPPER.readValue(clinic.getPhotos(), String[].class)));
                    }
                    existing.addAll(urls);
                    // Keep max 5
                    if (existing.size() > 5) existing = existing.subList(existing.size() - 5, existing.size());
                    clinic.setPhotos(MAPPER.writeValueAsString(existing));
                    clinicRepository.save(clinic);
                } catch (Exception e) {
                    errors.add("Failed to save to clinic: " + e.getMessage());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("uploaded", urls.size());
        result.put("urls", urls);
        if (!errors.isEmpty()) result.put("errors", errors);
        return result;
    }

    /**
     * Upload single clinic photo.
     */
    @PostMapping("/clinic-photo")
    @PreAuthorize("hasAnyRole('CLINIC', 'ADMIN')")
    public Map<String, Object> uploadClinicPhoto(
        @RequestParam("file") MultipartFile file,
        @RequestParam String clinicName,
        @RequestParam(defaultValue = "photo") String type,
        Authentication authentication
    ) {
        if (!cloudinaryService.isConfigured()) {
            throw new IllegalStateException("Image upload service is not configured.");
        }

        try {
            String url = cloudinaryService.uploadClinicPhoto(file, clinicName, type);

            // Save to clinic entity
            Long userId = (Long) authentication.getPrincipal();
            Clinic clinic = clinicRepository.findByOwnerUserId(userId).stream().findFirst().orElse(null);
            if (clinic != null) {
                List<String> photos = new ArrayList<>();
                if (clinic.getPhotos() != null && !clinic.getPhotos().isBlank()) {
                    try { photos = new ArrayList<>(List.of(MAPPER.readValue(clinic.getPhotos(), String[].class))); } catch (Exception ignored) {}
                }
                photos.add(url);
                if (photos.size() > 5) photos = photos.subList(photos.size() - 5, photos.size());
                clinic.setPhotos(MAPPER.writeValueAsString(photos));
                clinicRepository.save(clinic);
            }

            return Map.of("url", url, "status", "success");
        } catch (Exception e) {
            throw new IllegalArgumentException("Upload failed: " + e.getMessage());
        }
    }

    /**
     * Upload doctor profile photo and save URL to profile.
     */
    @PostMapping("/doctor-photo")
    @PreAuthorize("hasAnyRole('DOCTOR', 'CLINIC', 'ADMIN')")
    public Map<String, Object> uploadDoctorPhoto(
        @RequestParam("file") MultipartFile file,
        @RequestParam(defaultValue = "clinic") String clinicName,
        @RequestParam(defaultValue = "doctor") String doctorName,
        Authentication authentication
    ) {
        if (!cloudinaryService.isConfigured()) {
            throw new IllegalStateException("Image upload service is not configured.");
        }

        try {
            Long userId = (Long) authentication.getPrincipal();
            String url = cloudinaryService.uploadDoctorPhoto(file, clinicName, doctorName);

            // Save photo URL to doctor profile
            doctorProfileRepository.findByUserId(userId).ifPresent(profile -> {
                profile.setPhotoUrl(url);
                doctorProfileRepository.save(profile);
            });

            return Map.of("url", url, "status", "success");
        } catch (Exception e) {
            throw new IllegalArgumentException("Upload failed: " + e.getMessage());
        }
    }
}
