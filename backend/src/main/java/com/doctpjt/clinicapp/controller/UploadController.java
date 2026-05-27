package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.service.CloudinaryService;
import com.doctpjt.clinicapp.service.PrescriptionOCRService;
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

    private final CloudinaryService cloudinaryService;
    private final PrescriptionOCRService prescriptionOCRService;
    private final UserRepository userRepository;

    public UploadController(CloudinaryService cloudinaryService, PrescriptionOCRService prescriptionOCRService, UserRepository userRepository) {
        this.cloudinaryService = cloudinaryService;
        this.prescriptionOCRService = prescriptionOCRService;
        this.userRepository = userRepository;
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
     * Upload multiple clinic photos (up to 5).
     * POST /api/upload/clinic-photos
     * Form: files[] (multiple), clinicName
     */
    @PostMapping("/clinic-photos")
    @PreAuthorize("hasAnyRole('CLINIC', 'ADMIN')")
    public Map<String, Object> uploadClinicPhotos(
        @RequestParam("files") MultipartFile[] files,
        @RequestParam String clinicName,
        Authentication authentication
    ) {
        if (!cloudinaryService.isConfigured()) {
            throw new IllegalStateException("Image upload service is not configured. Please contact support.");
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

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("uploaded", urls.size());
        result.put("urls", urls);
        if (!errors.isEmpty()) result.put("errors", errors);
        return result;
    }

    /**
     * Upload single clinic photo (backward compatible).
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
            throw new IllegalStateException("Image upload service is not configured. Please contact support.");
        }

        try {
            String url = cloudinaryService.uploadClinicPhoto(file, clinicName, type);
            return Map.of("url", url, "status", "success");
        } catch (Exception e) {
            throw new IllegalArgumentException("Upload failed: " + e.getMessage());
        }
    }

    /**
     * Upload doctor profile photo.
     */
    @PostMapping("/doctor-photo")
    @PreAuthorize("hasAnyRole('DOCTOR', 'CLINIC', 'ADMIN')")
    public Map<String, Object> uploadDoctorPhoto(
        @RequestParam("file") MultipartFile file,
        @RequestParam String clinicName,
        @RequestParam String doctorName,
        Authentication authentication
    ) {
        if (!cloudinaryService.isConfigured()) {
            throw new IllegalStateException("Image upload service is not configured. Please contact support.");
        }

        try {
            String url = cloudinaryService.uploadDoctorPhoto(file, clinicName, doctorName);
            return Map.of("url", url, "status", "success");
        } catch (Exception e) {
            throw new IllegalArgumentException("Upload failed: " + e.getMessage());
        }
    }
}
