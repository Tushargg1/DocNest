package com.doctpjt.clinicapp.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class SymptomCheckerService {

    private final ObjectProvider<ChatModel> chatModelProvider;

    public SymptomCheckerService(ObjectProvider<ChatModel> chatModelProvider) {
        this.chatModelProvider = chatModelProvider;
    }

    public Map<String, Object> checkSymptoms(String symptoms, String age, String gender) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("symptoms", symptoms);
        result.put("disclaimer", "This is not a medical diagnosis. Please consult a qualified doctor for proper treatment.");

        String promptText = String.format(
            "You are a medical triage assistant. A %s %s patient reports these symptoms: %s. " +
            "Provide a brief response in this exact format:\n" +
            "POSSIBLE CONDITIONS: (list 2-3 most likely conditions)\n" +
            "SEVERITY: (low/medium/high)\n" +
            "RECOMMENDATION: (one-line advice on urgency and what specialist to see)\n" +
            "HOME CARE: (1-2 simple things they can do immediately)\n" +
            "Do NOT provide a diagnosis. Keep it concise.",
            age != null ? age + " year old" : "adult",
            gender != null ? gender : "patient",
            symptoms
        );

        ChatModel chatModel = chatModelProvider.getIfAvailable();
        if (chatModel != null) {
            try {
                ChatResponse response = chatModel.call(new Prompt(promptText));
                String content = response.getResult().getOutput().getText();
                if (content != null && !content.isBlank()) {
                    result.put("analysis", content.trim());
                    result.put("source", "ai");
                    return result;
                }
            } catch (Exception ignored) {
                // Fall through to rule-based fallback
            }
        }

        // Fallback: Simple rule-based triage
        result.put("analysis", generateFallbackAnalysis(symptoms));
        result.put("source", "rules");
        return result;
    }

    private String generateFallbackAnalysis(String symptoms) {
        String lower = symptoms.toLowerCase();
        StringBuilder analysis = new StringBuilder();

        // Simple keyword matching
        if (lower.contains("chest pain") || lower.contains("breathing difficulty") || lower.contains("unconscious")) {
            analysis.append("SEVERITY: HIGH\n");
            analysis.append("RECOMMENDATION: Please visit the nearest emergency room immediately or call emergency services.\n");
        } else if (lower.contains("fever") && (lower.contains("cough") || lower.contains("cold"))) {
            analysis.append("POSSIBLE CONDITIONS: Common cold, Flu, Upper respiratory infection\n");
            analysis.append("SEVERITY: Low to Medium\n");
            analysis.append("RECOMMENDATION: Visit a General Physician if symptoms persist beyond 3 days.\n");
            analysis.append("HOME CARE: Rest, stay hydrated, take paracetamol for fever if above 100°F.");
        } else if (lower.contains("headache")) {
            analysis.append("POSSIBLE CONDITIONS: Tension headache, Migraine, Dehydration\n");
            analysis.append("SEVERITY: Low\n");
            analysis.append("RECOMMENDATION: Visit a General Physician if headaches are recurring or severe.\n");
            analysis.append("HOME CARE: Rest in a quiet dark room, stay hydrated, apply cold compress.");
        } else if (lower.contains("stomach") || lower.contains("nausea") || lower.contains("vomiting")) {
            analysis.append("POSSIBLE CONDITIONS: Gastritis, Food poisoning, Indigestion\n");
            analysis.append("SEVERITY: Low to Medium\n");
            analysis.append("RECOMMENDATION: Visit a Gastroenterologist if symptoms persist beyond 24 hours.\n");
            analysis.append("HOME CARE: Avoid spicy food, take ORS, eat light bland food.");
        } else if (lower.contains("skin") || lower.contains("rash") || lower.contains("itching")) {
            analysis.append("POSSIBLE CONDITIONS: Allergic reaction, Contact dermatitis, Eczema\n");
            analysis.append("SEVERITY: Low\n");
            analysis.append("RECOMMENDATION: Visit a Dermatologist if rash spreads or doesn't improve in 2-3 days.\n");
            analysis.append("HOME CARE: Avoid scratching, use calamine lotion, take antihistamine if allergic.");
        } else if (lower.contains("joint") || lower.contains("back pain") || lower.contains("muscle")) {
            analysis.append("POSSIBLE CONDITIONS: Muscle strain, Joint inflammation, Posture-related pain\n");
            analysis.append("SEVERITY: Low\n");
            analysis.append("RECOMMENDATION: Visit an Orthopedic specialist if pain persists beyond a week.\n");
            analysis.append("HOME CARE: Apply ice/heat, gentle stretching, avoid heavy lifting.");
        } else {
            analysis.append("POSSIBLE CONDITIONS: Multiple conditions could match these symptoms\n");
            analysis.append("SEVERITY: Requires evaluation\n");
            analysis.append("RECOMMENDATION: Please visit a General Physician for proper examination.\n");
            analysis.append("HOME CARE: Rest and stay hydrated until you can see a doctor.");
        }

        return analysis.toString();
    }
}
