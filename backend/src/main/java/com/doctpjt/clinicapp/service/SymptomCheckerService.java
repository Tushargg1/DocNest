package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SymptomCheckerService {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final GroqAIService groqAI;
    private final PatientProfileRepository patientProfileRepository;

    public SymptomCheckerService(GroqAIService groqAI, PatientProfileRepository patientProfileRepository) {
        this.groqAI = groqAI;
        this.patientProfileRepository = patientProfileRepository;
    }

    public Map<String, Object> checkSymptoms(Long patientUserId, String symptoms) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("symptoms", symptoms);
        result.put("disclaimer", "This is not a medical diagnosis. Please consult a qualified doctor for proper treatment.");

        // Fetch patient profile for personalized context
        PatientProfile profile = patientUserId != null
            ? patientProfileRepository.findByUserId(patientUserId).orElse(null)
            : null;

        // Build patient context summary
        Map<String, Object> patientContext = buildPatientContext(profile);
        result.put("patientContext", patientContext);

        // Try AI first (Groq 70B with full medical context)
        if (groqAI.isConfigured()) {
            String aiAnalysis = generateAIAnalysis(symptoms, patientContext);
            if (aiAnalysis != null && !aiAnalysis.isBlank()) {
                result.put("analysis", aiAnalysis);
                result.put("source", "ai");
                return result;
            }
        }

        // Fallback rule-based
        result.put("analysis", generateFallbackAnalysis(symptoms, patientContext));
        result.put("source", "rules");
        return result;
    }

    private Map<String, Object> buildPatientContext(PatientProfile profile) {
        Map<String, Object> context = new LinkedHashMap<>();
        if (profile == null) return context;

        if (profile.getAge() != null) context.put("age", profile.getAge());
        if (profile.getGender() != null) context.put("gender", profile.getGender());
        if (profile.getBloodGroup() != null) context.put("bloodGroup", profile.getBloodGroup());
        if (profile.getHeight() != null) context.put("height", profile.getHeight() + " cm");
        if (profile.getWeight() != null) context.put("weight", profile.getWeight() + " kg");
        if (profile.getAllergies() != null && !profile.getAllergies().isBlank())
            context.put("knownAllergies", profile.getAllergies());
        if (profile.getCurrentMedications() != null && !profile.getCurrentMedications().isBlank())
            context.put("currentMedications", profile.getCurrentMedications());

        // Parse structured medical history
        String history = profile.getMedicalHistory();
        if (history != null && !history.isBlank()) {
            try {
                if (history.trim().startsWith("[")) {
                    Object parsed = MAPPER.readValue(history, Object.class);
                    context.put("medicalHistory", parsed);
                } else {
                    context.put("medicalHistory", history);
                }
            } catch (Exception ignored) {
                context.put("medicalHistory", history);
            }
        }

        return context;
    }

    private String generateAIAnalysis(String symptoms, Map<String, Object> patientContext) {
        String systemPrompt = "You are an experienced medical triage AI for Indian patients. "
            + "You will be given the patient's full medical context (age, gender, existing conditions, allergies, current medications, past medical history) AND their current symptoms. "
            + "Your job: Analyze the symptoms IN THE CONTEXT of the patient's history. Look for connections — for example: "
            + "if a diabetic patient reports tingling, mention diabetic neuropathy; if BP patient reports headache, mention hypertension link; "
            + "if patient is on certain meds, consider drug side effects. "
            + "Format your response EXACTLY as:\n"
            + "POSSIBLE CONDITIONS: <2-3 most likely conditions, considering patient's history>\n"
            + "WHY (BASED ON YOUR HISTORY): <brief explanation linking symptoms to known conditions/meds>\n"
            + "SEVERITY: <Low/Medium/High>\n"
            + "RECOMMENDATION: <which specialist to see and how urgent>\n"
            + "HOME CARE: <2-3 simple things they can do now>\n"
            + "WARNINGS: <any drug interactions or red flags based on their history>\n"
            + "Keep language simple. Do NOT diagnose definitively. Be cautious.";

        Map<String, Object> input = new LinkedHashMap<>();
        input.put("patient_context", patientContext);
        input.put("current_symptoms", symptoms);

        try {
            String userPrompt = MAPPER.writeValueAsString(input);
            return groqAI.call70B(systemPrompt, userPrompt);
        } catch (Exception e) {
            return null;
        }
    }

    private String generateFallbackAnalysis(String symptoms, Map<String, Object> patientContext) {
        String lower = symptoms.toLowerCase();
        StringBuilder analysis = new StringBuilder();

        // Check for emergency keywords
        if (lower.contains("chest pain") || lower.contains("breathing difficulty") || lower.contains("unconscious")) {
            analysis.append("SEVERITY: HIGH\n");
            analysis.append("RECOMMENDATION: Please go to the nearest emergency room immediately.\n");
            return analysis.toString();
        }

        // Use patient context for smarter fallback
        Object existingConditions = patientContext.get("medicalHistory");
        boolean isDiabetic = existingConditions != null && existingConditions.toString().toLowerCase().contains("diabet");
        boolean hasBP = existingConditions != null && existingConditions.toString().toLowerCase().contains("bp");

        if (lower.contains("fever") && lower.contains("cough")) {
            analysis.append("POSSIBLE CONDITIONS: Common cold, Flu, Upper respiratory infection\n");
            if (isDiabetic) analysis.append("WHY: As a diabetic patient, infections may take longer to resolve.\n");
            analysis.append("SEVERITY: Low to Medium\n");
            analysis.append("RECOMMENDATION: Visit a General Physician if symptoms persist beyond 3 days.\n");
            analysis.append("HOME CARE: Rest, stay hydrated, paracetamol for fever above 100°F.");
        } else if (lower.contains("headache")) {
            analysis.append("POSSIBLE CONDITIONS: Tension headache, Migraine, Dehydration\n");
            if (hasBP) analysis.append("WHY: With your high BP history, headaches need closer attention.\n");
            analysis.append("SEVERITY: ").append(hasBP ? "Medium" : "Low").append("\n");
            analysis.append("RECOMMENDATION: ").append(hasBP ? "Check your BP and visit doctor if elevated." : "Visit GP if recurring.").append("\n");
            analysis.append("HOME CARE: Rest in dark room, hydrate, cold compress.");
        } else if (lower.contains("tingling") || lower.contains("numbness")) {
            analysis.append("POSSIBLE CONDITIONS: Nerve issue, Vitamin B12 deficiency");
            if (isDiabetic) analysis.append(", Diabetic neuropathy");
            analysis.append("\n");
            if (isDiabetic) analysis.append("WHY: Tingling in diabetics can indicate diabetic neuropathy. Important to check sugar control.\n");
            analysis.append("SEVERITY: Medium\n");
            analysis.append("RECOMMENDATION: Visit a ").append(isDiabetic ? "Diabetologist or Neurologist" : "Neurologist").append(".\n");
        } else {
            analysis.append("POSSIBLE CONDITIONS: Multiple possibilities — needs proper examination\n");
            analysis.append("SEVERITY: Requires evaluation\n");
            analysis.append("RECOMMENDATION: Visit a General Physician for assessment.\n");
            analysis.append("HOME CARE: Rest and hydrate.");
        }

        return analysis.toString();
    }
}
