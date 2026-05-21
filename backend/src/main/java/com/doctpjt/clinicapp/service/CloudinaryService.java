package com.doctpjt.clinicapp.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Cloudinary image management with structured folder organization:
 * 
 * clinics/
 *   {clinic_name}/
 *     doctors/
 *       {doctor_name}/
 *         profile.jpg
 *         certificate_1.jpg
 * 
 * patients/
 *   {patient_name}_{phone}/
 *     prescriptions/
 *       rx_{visitId}.jpg  (temporary — deleted after OCR extraction)
 *     documents/
 *       report_1.jpg
 */
@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
        @Value("${cloudinary.cloud-name:}") String cloudName,
        @Value("${cloudinary.api-key:}") String apiKey,
        @Value("${cloudinary.api-secret:}") String apiSecret
    ) {
        if (cloudName != null && !cloudName.isBlank()) {
            this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true
            ));
        } else {
            this.cloudinary = null;
        }
    }

    public boolean isConfigured() {
        return cloudinary != null;
    }

    /**
     * Upload doctor profile photo.
     * Path: clinics/{clinicName}/doctors/{doctorName}/profile
     */
    public String uploadDoctorPhoto(MultipartFile file, String clinicName, String doctorName) throws IOException {
        String folder = buildPath("clinics", sanitize(clinicName), "doctors", sanitize(doctorName));
        return upload(file, folder, "profile");
    }

    /**
     * Upload doctor certificate.
     * Path: clinics/{clinicName}/doctors/{doctorName}/cert_{index}
     */
    public String uploadDoctorCertificate(MultipartFile file, String clinicName, String doctorName, int index) throws IOException {
        String folder = buildPath("clinics", sanitize(clinicName), "doctors", sanitize(doctorName));
        return upload(file, folder, "cert_" + index);
    }

    /**
     * Upload clinic photo (exterior/interior).
     * Path: clinics/{clinicName}/photos/{type}
     */
    public String uploadClinicPhoto(MultipartFile file, String clinicName, String type) throws IOException {
        String folder = buildPath("clinics", sanitize(clinicName), "photos");
        return upload(file, folder, sanitize(type));
    }

    /**
     * Upload patient prescription image (temporary — will be deleted after OCR).
     * Path: patients/{patientName}_{phone}/prescriptions/rx_{visitId}
     */
    public String uploadPrescription(MultipartFile file, String patientName, String phone, Long visitId) throws IOException {
        String patientFolder = sanitize(patientName) + "_" + sanitize(phone);
        String folder = buildPath("patients", patientFolder, "prescriptions");
        return upload(file, folder, "rx_" + visitId);
    }

    /**
     * Upload patient document (lab report, etc.).
     * Path: patients/{patientName}_{phone}/documents/{docName}
     */
    public String uploadPatientDocument(MultipartFile file, String patientName, String phone, String docName) throws IOException {
        String patientFolder = sanitize(patientName) + "_" + sanitize(phone);
        String folder = buildPath("patients", patientFolder, "documents");
        return upload(file, folder, sanitize(docName));
    }

    /**
     * Delete an image from Cloudinary by its public ID (extracted from URL).
     * Used after prescription is converted to text and data is saved in profile.
     */
    public boolean deleteImage(String imageUrl) {
        if (!isConfigured() || imageUrl == null || imageUrl.isBlank()) return false;
        try {
            String publicId = extractPublicId(imageUrl);
            if (publicId == null) return false;
            Map result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            return "ok".equals(result.get("result"));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Use Cloudinary's OCR to extract text from prescription image.
     * Uses the 'ocr' detection on upload.
     */
    public String extractTextFromImage(String imageUrl) {
        if (!isConfigured() || imageUrl == null) return null;
        try {
            // Use Groq AI instead for OCR (Cloudinary OCR is paid add-on)
            // This method is a placeholder — actual OCR happens via GroqAI
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    // ==================== HELPERS ====================

    @SuppressWarnings("unchecked")
    private String upload(MultipartFile file, String folder, String publicId) throws IOException {
        if (!isConfigured()) throw new IllegalStateException("Cloudinary is not configured");

        Map<String, Object> params = ObjectUtils.asMap(
            "folder", folder,
            "public_id", publicId,
            "overwrite", true,
            "resource_type", "auto"
        );

        Map<String, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
        return (String) result.get("secure_url");
    }

    private String sanitize(String input) {
        if (input == null) return "unknown";
        return input.trim()
            .toLowerCase()
            .replaceAll("[^a-z0-9_\\-]", "_")
            .replaceAll("_+", "_")
            .replaceAll("^_|_$", "");
    }

    private String buildPath(String... parts) {
        return String.join("/", parts);
    }

    /**
     * Extract Cloudinary public_id from a secure URL.
     * URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{public_id}.{ext}
     */
    private String extractPublicId(String url) {
        try {
            // Remove extension
            String withoutExt = url.substring(0, url.lastIndexOf('.'));
            // Find "/upload/" and take everything after version
            int uploadIdx = withoutExt.indexOf("/upload/");
            if (uploadIdx == -1) return null;
            String afterUpload = withoutExt.substring(uploadIdx + 8); // skip "/upload/"
            // Remove version (v12345678/)
            if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf('/') + 1);
            }
            return afterUpload;
        } catch (Exception e) {
            return null;
        }
    }
}
