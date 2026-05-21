package com.doctpjt.clinicapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Dual-model Groq AI service.
 * - llama-3.3-70b-versatile: conversation, understanding, summarization
 * - llama-3.1-8b-instant: fast extraction, classification
 */
@Service
public class GroqAIService {

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL_70B = "llama-3.3-70b-versatile";
    private static final String MODEL_8B = "llama-3.1-8b-instant";
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.groq.api-key:}")
    private String apiKey;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Use 70B for: summarization, understanding messy text, generating friendly questions
     */
    public String call70B(String systemPrompt, String userPrompt) {
        return callModel(MODEL_70B, systemPrompt, userPrompt, 0.3, 400);
    }

    /**
     * Use 8B for: fast extraction, yes/no classification, lightweight tasks
     */
    public String call8B(String systemPrompt, String userPrompt) {
        return callModel(MODEL_8B, systemPrompt, userPrompt, 0.1, 200);
    }

    /**
     * Extract structured JSON from user's free text answer using 8B (fast).
     * Compact prompt — only sends current state, not full conversation.
     */
    public String extractFromAnswer(String phase, String questionContext, String userAnswer, List<String> knownConditions) {
        if (!isConfigured()) return null;

        String systemPrompt = "You extract medical data from patient answers into JSON. Be concise. Output ONLY valid JSON.";
        String userPrompt = String.format(
            "{\"phase\":\"%s\",\"question\":\"%s\",\"answer\":\"%s\",\"known\":%s,\"task\":\"extract relevant medical data and determine if follow-up question is needed\"}",
            phase, questionContext, userAnswer,
            knownConditions != null ? knownConditions.toString() : "[]"
        );

        return call8B(systemPrompt, userPrompt);
    }

    /**
     * Generate patient-friendly summary using 70B.
     */
    public String generateSummary(Map<String, Object> patientData) {
        if (!isConfigured()) return null;

        String systemPrompt = "You are a medical records assistant. Create a brief, structured, doctor-friendly summary from patient intake data. Under 150 words. Skip empty/none values.";
        try {
            String userPrompt = MAPPER.writeValueAsString(patientData);
            return call70B(systemPrompt, userPrompt);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Normalize a free-text answer into clean structured language for a specific field.
     * Uses Groq 8B (fast) for the conversion. Falls back to rule-based normalization.
     */
    public String normalizeFieldAnswer(String fieldId, String userInput) {
        if (userInput == null || userInput.isBlank()) return "";
        String trimmed = userInput.trim();

        // Quick rule-based handling for "still" / "ongoing" type answers
        String lower = trimmed.toLowerCase();
        if ("recoveredWhen".equals(fieldId)) {
            if (lower.contains("still") || lower.contains("ongoing") || lower.contains("not recover")
                || lower.contains("continue") || lower.equals("no") || lower.contains("not yet")) {
                return "No (still ongoing)";
            }
            if (lower.contains("recover") || lower.contains("cured") || lower.contains("better") || lower.contains("ago")) {
                // Try AI for clean phrasing
                String ai = aiNormalize(fieldId, trimmed);
                return ai != null ? ai : "Yes - " + trimmed;
            }
        }

        if ("medicineName".equals(fieldId)) {
            if (lower.equals("no") || lower.equals("none") || lower.contains("don't") || lower.contains("dont")
                || lower.contains("nothing") || lower.contains("no medicine")) {
                return "";
            }
        }

        if ("medicationDuration".equals(fieldId)) {
            if (lower.contains("still") || lower.contains("ongoing") || lower.contains("continue") || lower.contains("present")) {
                return "Still ongoing";
            }
        }

        if ("startedWhen".equals(fieldId)) {
            // Normalize "23 age" -> "Age 23"
            if (lower.matches("\\d+\\s*(age|years?\\s*old)")) {
                String num = lower.replaceAll("[^0-9]", "");
                return "At age " + num;
            }
        }

        if ("doctorName".equals(fieldId)) {
            if (lower.equals("no") || lower.equals("none") || lower.contains("don't") || lower.contains("forgot")
                || lower.contains("remember") || lower.contains("dont know")) {
                return "";
            }
            // Capitalize and prefix Dr.
            String cleaned = trimmed;
            if (!cleaned.toLowerCase().startsWith("dr")) {
                cleaned = "Dr. " + capitalize(cleaned);
            }
            return cleaned;
        }

        if ("hospital".equals(fieldId)) {
            if (lower.equals("no") || lower.contains("don't") || lower.contains("forgot") || lower.contains("dont know")) {
                return "";
            }
            // Capitalize
            return capitalize(trimmed);
        }

        // For complex/ambiguous answers, ask AI to clean it up
        String ai = aiNormalize(fieldId, trimmed);
        return ai != null ? ai : trimmed;
    }

    private String aiNormalize(String fieldId, String userInput) {
        if (!isConfigured()) return null;

        Map<String, String> fieldDescriptions = Map.of(
            "startedWhen", "When the disease started (year, age, or relative time like '5 years ago')",
            "medicineName", "Medicine name and dose, or empty if none",
            "medicationDuration", "How long medicines were taken (e.g. '3 months', 'Still ongoing')",
            "recoveredWhen", "Whether recovered: 'Yes - <when>' or 'No (still ongoing)'",
            "hospital", "Clean hospital or clinic name",
            "doctorName", "Clean doctor name with Dr. prefix",
            "visitDate", "When last visited doctor (relative or absolute date)"
        );

        String fieldDesc = fieldDescriptions.getOrDefault(fieldId, "Medical field");

        String systemPrompt = "You are a medical text normalizer. Convert messy patient input into clean, structured medical text. "
            + "Output ONLY the cleaned value as plain text — no JSON, no explanation, no quotes. "
            + "Keep it SHORT (under 60 chars). Preserve the user's actual meaning. "
            + "If input is meaningless or empty, output empty string.";

        String userPrompt = String.format(
            "Field: %s\nDescription: %s\nUser input: \"%s\"\nClean output:",
            fieldId, fieldDesc, userInput
        );

        String result = call8B(systemPrompt, userPrompt);
        if (result == null) return null;

        // Clean up the response
        result = result.trim();
        // Remove surrounding quotes if AI added them
        if (result.startsWith("\"") && result.endsWith("\"") && result.length() > 1) {
            result = result.substring(1, result.length() - 1);
        }
        // Cap length
        if (result.length() > 80) result = result.substring(0, 80);

        return result;
    }

    private String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        StringBuilder result = new StringBuilder();
        boolean nextUpper = true;
        for (char c : s.toCharArray()) {
            if (Character.isWhitespace(c)) {
                result.append(c);
                nextUpper = true;
            } else if (nextUpper) {
                result.append(Character.toUpperCase(c));
                nextUpper = false;
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    private String callModel(String model, String systemPrompt, String userPrompt, double temperature, int maxTokens) {
        if (!isConfigured()) return null;

        try {
            String requestBody = MAPPER.writeValueAsString(Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", temperature,
                "max_tokens", maxTokens
            ));

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JsonNode root = MAPPER.readTree(response.body());
                return root.path("choices").path(0).path("message").path("content").asText(null);
            }
        } catch (Exception ignored) {
            // AI is optional, never block the flow
        }
        return null;
    }
}
