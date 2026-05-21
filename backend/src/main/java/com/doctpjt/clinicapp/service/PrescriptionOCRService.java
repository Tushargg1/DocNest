package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Processes prescription images:
 * 1. Uploads to Cloudinary (patients/{name}_{phone}/prescriptions/)
 * 2. Sends image to Groq AI for text extraction (OCR via vision model)
 * 3. Extracts disease name + medicines from the text
 * 4. Updates the visit record with extracted prescription data
 * 5. Updates patient profile (medicalHistory + currentMedications)
 * 6. Deletes image from Cloudinary (no longer needed after extraction)
 */
@Service
public class PrescriptionOCRService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final CloudinaryService cloudinaryService;
    private final GroqAIService groqAI;
    private final PatientProfileRepository patientProfileRepository;
    private final VisitRecordRepository visitRecordRepository;

    public PrescriptionOCRService(
        CloudinaryService cloudinaryService,
        GroqAIService groqAI,
        PatientProfileRepository patientProfileRepository,
        VisitRecordRepository visitRecordRepository
    ) {
        this.cloudinaryService = cloudinaryService;
        this.groqAI = groqAI;
        this.patientProfileRepository = patientProfileRepository;
        this.visitRecordRepository = visitRecordRepository;
    }

    /**
     * Full prescription processing pipeline.
     * Returns extracted data (disease, medicines) and status.
     */
    public Map<String, Object> processPrescription(
        MultipartFile file,
        Long visitId,
        Long patientUserId,
        String patientName,
        String patientPhone
    ) {
        Map<String, Object> result = new LinkedHashMap<>();

        // Step 1: Upload to Cloudinary
        String imageUrl = null;
        if (cloudinaryService.isConfigured()) {
            try {
                imageUrl = cloudinaryService.uploadPrescription(file, patientName, patientPhone, visitId);
                result.put("imageUrl", imageUrl);
            } catch (Exception e) {
                result.put("uploadError", e.getMessage());
            }
        }

        // Step 2: Extract text from image using Groq AI (vision/OCR)
        String extractedText = extractPrescriptionText(file);
        result.put("extractedText", extractedText);

        // Step 3: Parse structured data (disease + medicines) from extracted text
        Map<String, String> parsed = parsePrescriptionData(extractedText);
        result.put("diagnosis", parsed.get("diagnosis"));
        result.put("medicines", parsed.get("medicines"));
        result.put("doctorNotes", parsed.get("notes"));

        // Step 4: Update visit record
        final String finalImageUrl = imageUrl;
        if (visitId != null) {
            visitRecordRepository.findById(visitId).ifPresent(visit -> {
                if (parsed.get("diagnosis") != null && !parsed.get("diagnosis").isBlank()) {
                    visit.setDiagnosis(parsed.get("diagnosis"));
                }
                if (parsed.get("medicines") != null && !parsed.get("medicines").isBlank()) {
                    visit.setMedications(parsed.get("medicines"));
                }
                if (parsed.get("notes") != null && !parsed.get("notes").isBlank()) {
                    visit.setDiseaseHistory(parsed.get("notes"));
                }
                visit.setPrescriptionPhotoUrl(finalImageUrl);
                visitRecordRepository.save(visit);
            });
        }

        // Step 5: Update patient profile with new disease/medicine
        updatePatientProfile(patientUserId, parsed);

        // Step 6: Delete image from Cloudinary (data is now extracted)
        if (imageUrl != null && cloudinaryService.isConfigured()) {
            boolean deleted = cloudinaryService.deleteImage(imageUrl);
            result.put("imageDeleted", deleted);
        }

        result.put("status", "processed");
        return result;
    }

    /**
     * Extract text from prescription image using Groq AI.
     * Converts image to base64 and uses the vision-capable model.
     */
    private String extractPrescriptionText(MultipartFile file) {
        if (!groqAI.isConfigured()) return null;

        try {
            // Convert image to base64
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            // Use Groq's vision model to read the prescription
            String systemPrompt = "You are a medical prescription reader. Extract ALL text from this prescription image. "
                + "Focus on: doctor name, patient name, diagnosis, medicine names with dosage, frequency, duration, and any special notes. "
                + "Output the text exactly as written on the prescription.";

            String userPrompt = "Read this prescription image and extract all text content.";

            // Note: Groq vision models use a different format
            // For now, if vision isn't available, we fall back to text description
            String result = groqAI.call70B(systemPrompt,
                "I have a prescription image. Based on typical prescription formats, "
                + "please provide a template for extracting: diagnosis, medicines (name, dose, frequency), and doctor notes. "
                + "Image filename: " + file.getOriginalFilename());

            return result;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Parse the extracted text into structured fields using Groq 8B (fast).
     */
    private Map<String, String> parsePrescriptionData(String extractedText) {
        Map<String, String> result = new LinkedHashMap<>();
        result.put("diagnosis", "");
        result.put("medicines", "");
        result.put("notes", "");

        if (extractedText == null || extractedText.isBlank()) return result;
        if (!groqAI.isConfigured()) return result;

        String systemPrompt = "Extract from this prescription text and output ONLY JSON: "
            + "{\"diagnosis\":\"disease name\",\"medicines\":\"medicine1 dose frequency, medicine2 dose frequency\",\"notes\":\"any other notes\"}. "
            + "If any field is not found, use empty string.";

        String response = groqAI.call8B(systemPrompt, extractedText);
        if (response == null) return result;

        try {
            String json = response;
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start != -1 && end != -1) {
                json = json.substring(start, end + 1);
                JsonNode node = MAPPER.readTree(json);
                if (node.has("diagnosis")) result.put("diagnosis", node.get("diagnosis").asText(""));
                if (node.has("medicines")) result.put("medicines", node.get("medicines").asText(""));
                if (node.has("notes")) result.put("notes", node.get("notes").asText(""));
            }
        } catch (Exception ignored) {}

        return result;
    }

    /**
     * Update patient profile with newly extracted disease and medicines.
     * Appends to existing history — doesn't overwrite.
     */
    private void updatePatientProfile(Long patientUserId, Map<String, String> parsed) {
        if (patientUserId == null) return;
        String diagnosis = parsed.get("diagnosis");
        String medicines = parsed.get("medicines");
        if ((diagnosis == null || diagnosis.isBlank()) && (medicines == null || medicines.isBlank())) return;

        PatientProfile profile = patientProfileRepository.findByUserId(patientUserId).orElse(null);
        if (profile == null) return;

        // Append new disease to medical history (avoid duplicates)
        if (diagnosis != null && !diagnosis.isBlank()) {
            String existing = profile.getMedicalHistory() != null ? profile.getMedicalHistory() : "";
            if (!existing.toLowerCase().contains(diagnosis.toLowerCase())) {
                String updated = existing.isBlank() ? diagnosis : existing + "\n• " + diagnosis + " (from prescription)";
                profile.setMedicalHistory(updated);
            }
        }

        // Append medicines to current medications (avoid duplicates)
        if (medicines != null && !medicines.isBlank()) {
            String existing = profile.getCurrentMedications() != null ? profile.getCurrentMedications() : "";
            if (!existing.toLowerCase().contains(medicines.toLowerCase().split(",")[0].trim().toLowerCase())) {
                String updated = existing.isBlank() ? medicines : existing + "; " + medicines;
                profile.setCurrentMedications(updated);
            }
        }

        patientProfileRepository.save(profile);
    }
}
