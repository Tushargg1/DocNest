package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.ClinicalEmbedding;
import com.doctpjt.clinicapp.entity.PatientProfile;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.PatientProfileRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * RAG-Powered Structured Medical History Intake.
 *
 * RAG Flow:
 * 1. RETRIEVAL: On start, retrieves patient's existing visit records + embeddings
 * 2. AUGMENTATION: Pre-fills known conditions from past visits, skips redundant questions
 * 3. GENERATION: AI uses retrieved context to ask smarter follow-ups
 *
 * For each condition, collects structured fields:
 *   diseaseName, startedWhen, medicineName, recoveredWhen, hospital, doctorName, visitDate, medicationDuration
 */
@Service
public class HealthIntakeService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final PatientProfileRepository patientProfileRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final ClinicalEmbeddingService clinicalEmbeddingService;
    private final GroqAIService groqAI;
    private final ConcurrentHashMap<Long, IntakeSession> sessions = new ConcurrentHashMap<>();

    // Fixed list of fields per condition
    private static final List<Map<String, String>> CONDITION_FIELDS = List.of(
        Map.of("id", "startedWhen", "label", "When did it start?",
            "hint", "Approximate is fine. Example: '5 years ago', 'in 2020', 'when I was 25'",
            "placeholder", "e.g. 5 years ago"),
        Map.of("id", "medicineName", "label", "Medicine taken (if any)",
            "hint", "Medicine name and dose if you know. Leave blank if you don't remember.",
            "placeholder", "e.g. Metformin 500mg, or leave blank"),
        Map.of("id", "medicationDuration", "label", "How long did you take medicines?",
            "hint", "Example: '3 months', 'still taking', '1 year'",
            "placeholder", "e.g. 3 months, or 'still ongoing'"),
        Map.of("id", "recoveredWhen", "label", "When did you recover?",
            "hint", "If still ongoing, write 'still have it'. Example: 'recovered in 2022'",
            "placeholder", "e.g. recovered 2 years ago, or 'still ongoing'"),
        Map.of("id", "hospital", "label", "Hospital or Clinic name",
            "hint", "Where did you get treatment? Example: 'Apollo Hospital', 'local clinic'",
            "placeholder", "e.g. Max Hospital, or local clinic"),
        Map.of("id", "doctorName", "label", "Doctor's name",
            "hint", "If you remember. Example: 'Dr. Sharma', 'Dr. Singh'. Skip if unknown.",
            "placeholder", "e.g. Dr. Sharma"),
        Map.of("id", "visitDate", "label", "Last visit date",
            "hint", "Approximate. Example: 'last month', '6 months ago', 'June 2024'",
            "placeholder", "e.g. 2 months ago")
    );

    public HealthIntakeService(PatientProfileRepository patientProfileRepository, VisitRecordRepository visitRecordRepository, ClinicalEmbeddingService clinicalEmbeddingService, GroqAIService groqAI) {
        this.patientProfileRepository = patientProfileRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.clinicalEmbeddingService = clinicalEmbeddingService;
        this.groqAI = groqAI;
    }

    // ==================== PUBLIC API ====================

    public Map<String, Object> startIntake(Long patientUserId) {
        IntakeSession session = new IntakeSession(patientUserId);

        // === RAG STEP 1: RETRIEVAL ===
        // Retrieve existing patient data from profile + visit history + embeddings
        PatientProfile existingProfile = patientProfileRepository.findByUserId(patientUserId).orElse(null);
        List<VisitRecord> pastVisits = visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(patientUserId);
        List<ClinicalEmbedding> relevantEmbeddings = clinicalEmbeddingService.findTopMatches(patientUserId, "medical history conditions medications", 5);

        // === RAG STEP 2: AUGMENTATION ===
        // Pre-fill known data so we don't ask redundant questions
        if (existingProfile != null) {
            if (existingProfile.getAge() != null) session.answers.put("age", String.valueOf(existingProfile.getAge()));
            if (existingProfile.getGender() != null) session.answers.put("gender", existingProfile.getGender());
            if (existingProfile.getHeight() != null) session.answers.put("height", String.valueOf(existingProfile.getHeight()));
            if (existingProfile.getWeight() != null) session.answers.put("weight", String.valueOf(existingProfile.getWeight()));
            if (existingProfile.getBloodGroup() != null) session.answers.put("bloodGroup", existingProfile.getBloodGroup());
        }

        // Build RAG context from past visits for AI to use
        StringBuilder ragContext = new StringBuilder();
        for (VisitRecord visit : pastVisits) {
            if (visit.getDiagnosis() != null) ragContext.append("Past diagnosis: ").append(visit.getDiagnosis()).append("\n");
            if (visit.getMedications() != null) ragContext.append("Past medications: ").append(visit.getMedications()).append("\n");
        }
        for (ClinicalEmbedding emb : relevantEmbeddings) {
            if (emb.getSourceText() != null) ragContext.append("Embedded record: ").append(emb.getSourceText()).append("\n");
        }
        session.ragContext = ragContext.toString();

        // Pre-populate known conditions from visit history
        List<String> knownConditions = pastVisits.stream()
            .map(VisitRecord::getDiagnosis)
            .filter(d -> d != null && !d.isBlank())
            .distinct()
            .collect(Collectors.toList());
        session.knownFromRAG = knownConditions;

        sessions.put(patientUserId, session);

        // Build response with RAG info
        Map<String, Object> response = buildNextQuestion(session);
        if (!knownConditions.isEmpty()) {
            response.put("ragInfo", Map.of(
                "message", "We found some information from your previous visits.",
                "knownConditions", knownConditions,
                "preFilledFields", session.answers.keySet()
            ));
        }
        return response;
    }

    public Map<String, Object> submitAnswer(Long patientUserId, Map<String, Object> answer) {
        IntakeSession session = sessions.get(patientUserId);
        if (session == null) {
            session = new IntakeSession(patientUserId);
            sessions.put(patientUserId, session);
        }

        String questionId = (String) answer.get("questionId");
        Object value = answer.get("value");

        session.answers.put(questionId, value);
        updateSessionState(session, questionId, value);

        return buildNextQuestion(session);
    }

    public Map<String, Object> completeIntake(Long patientUserId) {
        IntakeSession session = sessions.get(patientUserId);
        if (session == null) throw new IllegalArgumentException("No active intake session");
        saveToProfile(session);

        // === RAG STEP 3: EMBED NEW DATA ===
        // Store the intake answers as a new embedding for future RAG retrieval
        try {
            String intakeText = "Health intake completed. " +
                "Conditions: " + session.conditionRecords.stream()
                    .map(r -> r.get("diseaseName"))
                    .collect(Collectors.joining(", ")) +
                ". Medications: " + session.answers.getOrDefault("currentMedications", "none");

            // Create a synthetic visit-like embedding for the intake
            VisitRecord syntheticVisit = new VisitRecord();
            syntheticVisit.setId(0L); // Will be set by embedding service
            syntheticVisit.setPatientUserId(patientUserId);
            syntheticVisit.setDoctorUserId(0L);
            syntheticVisit.setDiagnosis(session.conditionRecords.stream()
                .map(r -> r.get("diseaseName")).collect(Collectors.joining(", ")));
            syntheticVisit.setMedications(session.conditionRecords.stream()
                .map(r -> r.get("medicineName")).filter(m -> m != null && !m.isBlank())
                .collect(Collectors.joining(", ")));
            syntheticVisit.setDiseaseHistory(intakeText);
            clinicalEmbeddingService.embedVisit(syntheticVisit);
        } catch (Exception ignored) {
            // Embedding is optional — don't fail the intake
        }

        sessions.remove(patientUserId);
        return Map.of("status", "completed", "message", "Your medical history has been saved!");
    }

    // ==================== SESSION ====================

    private static class IntakeSession {
        Long patientUserId;
        Map<String, Object> answers = new LinkedHashMap<>();
        // Structured per-condition data
        List<Map<String, String>> conditionRecords = new ArrayList<>();
        // Current state machine
        String phase = "basics";
        int currentConditionIndex = 0;
        int currentFieldIndex = 0;
        // RAG context
        String ragContext = ""; // Retrieved visit history for AI augmentation
        List<String> knownFromRAG = new ArrayList<>(); // Conditions already known from past visits

        IntakeSession(Long patientUserId) { this.patientUserId = patientUserId; }
    }

    // ==================== FLOW ENGINE ====================

    private Map<String, Object> buildNextQuestion(IntakeSession session) {
        // PHASE 1: Basic Info
        if (session.phase.equals("basics")) {
            Map<String, Object> q = getNextBasicQuestion(session);
            if (q != null) return wrap(q, session);
            session.phase = "conditions_select";
        }

        // PHASE 2: Select conditions
        if (session.phase.equals("conditions_select")) {
            if (!session.answers.containsKey("chronicConditions")) {
                return wrap(getConditionsQuestion(session), session);
            }
            // Initialize condition records
            initializeConditionRecords(session);
            session.phase = "condition_details";
            session.currentConditionIndex = 0;
            session.currentFieldIndex = 0;
        }

        // PHASE 3: Per-condition details (fixed 7 fields per condition)
        if (session.phase.equals("condition_details")) {
            if (session.currentConditionIndex < session.conditionRecords.size()) {
                Map<String, String> currentRecord = session.conditionRecords.get(session.currentConditionIndex);
                String diseaseName = currentRecord.get("diseaseName");

                if (session.currentFieldIndex < CONDITION_FIELDS.size()) {
                    Map<String, String> field = CONDITION_FIELDS.get(session.currentFieldIndex);
                    Map<String, Object> q = new LinkedHashMap<>();
                    q.put("id", "cond_" + session.currentConditionIndex + "_" + field.get("id"));
                    q.put("phase", "About: " + diseaseName);
                    q.put("type", "text");
                    q.put("question", field.get("label") + " (for " + diseaseName + ")");
                    q.put("hint", field.get("hint"));
                    q.put("placeholder", field.get("placeholder"));
                    return wrap(q, session);
                }

                // Move to next condition
                session.currentConditionIndex++;
                session.currentFieldIndex = 0;
                return buildNextQuestion(session);
            }
            session.phase = "allergies";
        }

        // PHASE 4: Allergies
        if (session.phase.equals("allergies")) {
            if (!session.answers.containsKey("allergies")) {
                return wrap(getAllergiesQuestion(), session);
            }
            session.phase = "lifestyle";
        }

        // PHASE 5: Lifestyle
        if (session.phase.equals("lifestyle")) {
            Map<String, Object> q = getNextLifestyleQuestion(session);
            if (q != null) return wrap(q, session);
            session.phase = "done";
        }

        // DONE
        return buildSummary(session);
    }

    // ==================== BASE QUESTIONS ====================

    private Map<String, Object> getNextBasicQuestion(IntakeSession session) {
        if (!session.answers.containsKey("age"))
            return Map.of("id", "age", "phase", "Basic Info", "type", "number",
                "question", "How old are you?", "hint", "Your age in years", "placeholder", "e.g. 28");
        if (!session.answers.containsKey("gender"))
            return Map.of("id", "gender", "phase", "Basic Info", "type", "mcq",
                "question", "What is your gender?", "options", List.of("Male", "Female", "Other", "Prefer not to say"));
        if (!session.answers.containsKey("height"))
            return Map.of("id", "height", "phase", "Basic Info", "type", "number",
                "question", "Your height in cm?", "hint", "5 feet = 152, 5'5\" = 165, 6 feet = 183", "placeholder", "e.g. 170");
        if (!session.answers.containsKey("weight"))
            return Map.of("id", "weight", "phase", "Basic Info", "type", "number",
                "question", "Your weight in kg?", "hint", "Approximate is fine", "placeholder", "e.g. 65");
        if (!session.answers.containsKey("bloodGroup"))
            return Map.of("id", "bloodGroup", "phase", "Basic Info", "type", "mcq",
                "question", "Do you know your blood group?",
                "hint", "Found on blood test reports. It's okay to not know!",
                "options", List.of("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Don't know"));
        return null;
    }

    private Map<String, Object> getConditionsQuestion(IntakeSession session) {
        Map<String, Object> q = new LinkedHashMap<>();
        q.put("id", "chronicConditions");
        q.put("phase", "Health Conditions");
        q.put("type", "multi-select");

        if (!session.knownFromRAG.isEmpty()) {
            q.put("question", "From your previous visits, we know about: " + String.join(", ", session.knownFromRAG) + ". Do you have any OTHER health conditions?");
            q.put("hint", "We've pre-selected conditions from your visit history. Add any new ones or remove incorrect ones.");
        } else {
            q.put("question", "Have you ever had any of these health problems? (past or current)");
            q.put("hint", "Select ALL that apply. Include both current and past illnesses you've been treated for.");
        }

        q.put("options", List.of(
            "Diabetes (high sugar)", "High BP (blood pressure)", "Asthma / Breathing problem",
            "Thyroid issue", "Heart problem", "Kidney problem", "Arthritis / Joint pain",
            "Depression / Anxiety", "PCOD / PCOS", "Migraine", "Back pain / Slip disc",
            "Tuberculosis (TB)", "Jaundice / Liver issues", "Cancer (any type)",
            "None of these"
        ));
        q.put("allowOther", true);
        q.put("otherPlaceholder", "Any other illness or operation...");

        // Pre-select known conditions from RAG
        if (!session.knownFromRAG.isEmpty()) {
            q.put("preSelected", session.knownFromRAG);
        }

        return q;
    }

    private Map<String, Object> getAllergiesQuestion() {
        return Map.of("id", "allergies", "phase", "Allergies", "type", "multi-select",
            "question", "Do any of these cause you itching, rashes, breathing problems, or swelling?",
            "hint", "Select ALL things your body reacts badly to.",
            "options", List.of(
                "Dust / Pollen", "Milk / Dairy", "Eggs", "Peanuts / Nuts",
                "Seafood / Fish", "Antibiotics (Penicillin)", "Painkillers (Brufen, Combiflam)",
                "Perfumes / Chemicals", "Insect bites", "No allergies"
            ), "allowOther", true, "otherPlaceholder", "Type other allergy...");
    }

    private Map<String, Object> getNextLifestyleQuestion(IntakeSession session) {
        if (!session.answers.containsKey("smoking"))
            return Map.of("id", "smoking", "phase", "Lifestyle", "type", "mcq",
                "question", "Do you use tobacco in any form?",
                "hint", "Cigarettes, bidi, gutka, paan masala, hookah, vape — all count.",
                "options", List.of("Never", "Quit", "Occasionally", "Daily"));
        if (!session.answers.containsKey("alcohol"))
            return Map.of("id", "alcohol", "phase", "Lifestyle", "type", "mcq",
                "question", "Do you drink alcohol?",
                "options", List.of("Never", "Quit", "Occasionally (social)", "Regularly"));
        if (!session.answers.containsKey("emergencyContact"))
            return Map.of("id", "emergencyContact", "phase", "Emergency", "type", "text",
                "question", "Emergency contact — who should we call if needed?",
                "hint", "Name and phone number of a family member.",
                "placeholder", "e.g. Priya Sharma (wife) - 9876543210");
        return null;
    }

    // ==================== STATE UPDATE ====================

    @SuppressWarnings("unchecked")
    private void initializeConditionRecords(IntakeSession session) {
        Object value = session.answers.get("chronicConditions");
        List<String> conditions = new ArrayList<>();
        if (value instanceof List) {
            for (Object o : (List<Object>) value) {
                String s = o.toString().trim();
                if (!s.isEmpty() && !s.contains("None") && !s.contains("don't know") && !s.contains("NA")) {
                    conditions.add(s);
                }
            }
        }

        for (String cond : conditions) {
            Map<String, String> record = new LinkedHashMap<>();
            record.put("diseaseName", cond);
            for (Map<String, String> field : CONDITION_FIELDS) {
                record.put(field.get("id"), "");
            }
            session.conditionRecords.add(record);
        }
    }

    private void updateSessionState(IntakeSession session, String questionId, Object value) {
        // If this is a condition-detail question, store it in the right record
        if (questionId != null && questionId.startsWith("cond_")) {
            String[] parts = questionId.split("_", 3);
            if (parts.length == 3) {
                try {
                    int condIdx = Integer.parseInt(parts[1]);
                    String fieldId = parts[2];
                    if (condIdx < session.conditionRecords.size()) {
                        String strVal = value != null ? value.toString() : "";
                        // Don't store NA/skip as the field value
                        if (strVal.contains("don't know") || strVal.contains("NA") || strVal.equalsIgnoreCase("skip")) {
                            strVal = "";
                        }
                        // Normalize free-text input into clean structured value
                        if (!strVal.isBlank()) {
                            strVal = groqAI.normalizeFieldAnswer(fieldId, strVal);
                        }
                        session.conditionRecords.get(condIdx).put(fieldId, strVal);
                        session.currentFieldIndex++;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
    }

    // ==================== RESPONSE WRAPPING ====================

    private Map<String, Object> wrap(Map<String, Object> question, IntakeSession session) {
        Map<String, Object> response = new LinkedHashMap<>(question);
        int total = estimateTotal(session);
        int current = Math.min(session.answers.size() + 1, total);
        int percentage = total > 0 ? (current * 100) / total : 0;
        response.put("progress", Map.of("current", current, "total", total, "percentage", Math.min(percentage, 99)));
        response.put("status", "in_progress");
        return response;
    }

    private int estimateTotal(IntakeSession session) {
        int basics = 5; // age, gender, height, weight, bloodGroup
        int select = 1; // conditions multi-select
        int conditionDetails = session.conditionRecords.size() * CONDITION_FIELDS.size();
        int allergies = 1;
        int lifestyle = 3;
        return basics + select + conditionDetails + allergies + lifestyle;
    }

    // ==================== SUMMARY ====================

    private Map<String, Object> buildSummary(IntakeSession session) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "review");
        response.put("message", "Here's your complete medical history. Please review and confirm.");

        // Structured summary
        Map<String, Object> summary = new LinkedHashMap<>();
        if (session.answers.get("age") != null) summary.put("age", session.answers.get("age"));
        if (session.answers.get("gender") != null) summary.put("gender", session.answers.get("gender"));
        if (session.answers.get("height") != null) summary.put("height", session.answers.get("height") + " cm");
        if (session.answers.get("weight") != null) summary.put("weight", session.answers.get("weight") + " kg");
        Object bg = session.answers.get("bloodGroup");
        if (bg != null && !"Don't know".equals(bg.toString())) summary.put("bloodGroup", bg);

        // Structured medical history table
        summary.put("medicalHistory", session.conditionRecords);

        Object allergies = session.answers.get("allergies");
        if (allergies != null && !allergies.toString().contains("No allergies") && !allergies.toString().contains("don't know")) {
            summary.put("allergies", allergies);
        }
        if (session.answers.get("smoking") != null) summary.put("smoking", session.answers.get("smoking"));
        if (session.answers.get("alcohol") != null) summary.put("alcohol", session.answers.get("alcohol"));
        if (session.answers.get("emergencyContact") != null) summary.put("emergencyContact", session.answers.get("emergencyContact"));

        response.put("summary", summary);

        // AI Summary augmented with RAG context (retrieved visit history)
        Map<String, Object> augmentedData = new LinkedHashMap<>(summary);
        if (session.ragContext != null && !session.ragContext.isBlank()) {
            augmentedData.put("previousVisitHistory", session.ragContext);
        }
        String aiSummary = groqAI.generateSummary(augmentedData);
        if (aiSummary != null) response.put("aiSummary", aiSummary);

        return response;
    }

    // ==================== SAVE TO PROFILE ====================

    private void saveToProfile(IntakeSession session) {
        PatientProfile profile = patientProfileRepository.findByUserId(session.patientUserId).orElse(new PatientProfile());
        profile.setUserId(session.patientUserId);

        // Basic fields
        try { profile.setAge(Integer.parseInt(String.valueOf(session.answers.get("age")))); } catch (Exception ignored) {}
        Object gender = session.answers.get("gender");
        if (gender != null && !gender.toString().contains("Prefer not")) profile.setGender(gender.toString());
        try { profile.setHeight(Double.parseDouble(String.valueOf(session.answers.get("height")))); } catch (Exception ignored) {}
        try { profile.setWeight(Double.parseDouble(String.valueOf(session.answers.get("weight")))); } catch (Exception ignored) {}
        Object bg = session.answers.get("bloodGroup");
        if (bg != null && !"Don't know".equals(bg.toString())) profile.setBloodGroup(bg.toString());

        // Allergies
        Object allergies = session.answers.get("allergies");
        if (allergies != null && !allergies.toString().contains("No allergies") && !allergies.toString().contains("don't know")) {
            String s = allergies.toString().replace("[", "").replace("]", "");
            profile.setAllergies(s);
        }

        // Save medical history as STRUCTURED JSON
        try {
            String historyJson = MAPPER.writeValueAsString(session.conditionRecords);
            profile.setMedicalHistory(historyJson);
        } catch (Exception e) {
            profile.setMedicalHistory("[]");
        }

        // Current medications: aggregate from all conditions
        StringBuilder meds = new StringBuilder();
        for (Map<String, String> record : session.conditionRecords) {
            String med = record.get("medicineName");
            String recovered = record.get("recoveredWhen");
            if (med != null && !med.isBlank()) {
                // Only include current/ongoing medications
                if (recovered == null || recovered.isBlank() || recovered.toLowerCase().contains("ongoing") || recovered.toLowerCase().contains("still")) {
                    if (!meds.isEmpty()) meds.append("; ");
                    meds.append(record.get("diseaseName")).append(": ").append(med);
                }
            }
        }
        if (!meds.isEmpty()) profile.setCurrentMedications(meds.toString());

        // Emergency contact
        Object emergency = session.answers.get("emergencyContact");
        if (emergency != null && !emergency.toString().isBlank()) profile.setEmergencyContact(emergency.toString());

        patientProfileRepository.save(profile);
    }
}
