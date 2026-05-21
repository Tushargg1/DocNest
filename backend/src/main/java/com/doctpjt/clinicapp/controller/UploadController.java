package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import com.doctpjt.clinicapp.service.CloudinaryService;
import com.doctpjt.clinicapp.service.PrescriptionOCRService;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "https://docnest-3-v5sy.onrender.com"})
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
     * Upload prescription image → OCR → extract text → update profile → delete image.
     * POST /api/upload/prescription/{visitId}
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
     * Upload doctor profile photo.
     * POST /api/upload/doctor-photo?clinicName=xxx&doctorName=yyy
     */
    @PostMapping("/doctor-photo")
    @PreAuthorize("hasAnyRole('DOCTOR', 'CLINIC', 'ADMIN')")
    public Map<String, String> uploadDoctorPhoto(
        @RequestParam("file") MultipartFile file,
        @RequestParam String clinicName,
        @RequestParam String doctorName
    ) throws Exception {
        String url = cloudinaryService.uploadDoctorPhoto(file, clinicName, doctorName);
        return Map.of("url", url);
    }

    /**
     * Upload clinic photo.
     * POST /api/upload/clinic-photo?clinicName=xxx&type=exterior|interior|reception
     */
    @PostMapping("/clinic-photo")
    @PreAuthorize("hasAnyRole('CLINIC', 'ADMIN')")
    public Map<String, String> uploadClinicPhoto(
        @RequestParam("file") MultipartFile file,
        @RequestParam String clinicName,
        @RequestParam(defaultValue = "photo") String type
    ) throws Exception {
        String url = cloudinaryService.uploadClinicPhoto(file, clinicName, type);
        return Map.of("url", url);
    }
}
