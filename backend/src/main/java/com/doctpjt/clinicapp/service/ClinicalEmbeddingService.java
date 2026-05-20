package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.ClinicalEmbedding;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.ClinicalEmbeddingRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class ClinicalEmbeddingService {

    private static final int FALLBACK_DIMENSIONS = 64;

    private final ClinicalEmbeddingRepository clinicalEmbeddingRepository;
    private final ObjectProvider<EmbeddingModel> embeddingModelProvider;
    private final ObjectProvider<ChatModel> chatModelProvider;

    public ClinicalEmbeddingService(
        ClinicalEmbeddingRepository clinicalEmbeddingRepository,
        ObjectProvider<EmbeddingModel> embeddingModelProvider,
        ObjectProvider<ChatModel> chatModelProvider
    ) {
        this.clinicalEmbeddingRepository = clinicalEmbeddingRepository;
        this.embeddingModelProvider = embeddingModelProvider;
        this.chatModelProvider = chatModelProvider;
    }

    public void embedVisit(VisitRecord visit) {
        String sourceText = buildSourceText(visit);
        float[] embedding = embedText(sourceText);

        ClinicalEmbedding record = new ClinicalEmbedding();
        record.setVisitId(visit.getId());
        record.setPatientId(visit.getPatientUserId());
        record.setDoctorUserId(visit.getDoctorUserId());
        record.setSourceText(sourceText);
        record.setEmbeddingVector(serializeVector(embedding));
        record.setMetadataJson(buildMetadataJson(visit));
        clinicalEmbeddingRepository.save(record);
    }

    public String generatePatientSummary(Long patientId) {
        List<ClinicalEmbedding> matches = findTopMatches(patientId, summaryQuery(), 5);
        if (matches.isEmpty()) {
            return "No embedded visit history is available for this patient yet.";
        }

        String context = matches.stream()
            .map(match -> formatContextLine(match))
            .collect(Collectors.joining("\n"));

        String promptText = "You are a clinical assistant. Based on the following history: "
            + context
            + "\nProvide a concise summary of this patient's chronic conditions and current medications.";

        ChatModel chatModel = chatModelProvider.getIfAvailable();
        if (chatModel == null) {
            return fallbackSummary(matches);
        }

        try {
            ChatResponse response = chatModel.call(new Prompt(promptText));
            String content = response.getResult().getOutput().getText();
            if (content != null && !content.isBlank()) {
                return content.trim();
            }
        } catch (Exception ignored) {
            // Fall back to a deterministic summary if the model is unavailable or misconfigured.
        }

        return fallbackSummary(matches);
    }

    public List<ClinicalEmbedding> findTopMatches(Long patientId, String queryText, int topK) {
        List<ClinicalEmbedding> embeddings = clinicalEmbeddingRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
        if (embeddings.isEmpty()) {
            return List.of();
        }

        float[] queryEmbedding = embedText(queryText);
        return embeddings.stream()
            .map(record -> new ScoredEmbedding(record, cosineSimilarity(queryEmbedding, deserializeVector(record.getEmbeddingVector()))))
            .sorted(Comparator.comparingDouble(ScoredEmbedding::score).reversed())
            .limit(topK)
            .map(ScoredEmbedding::record)
            .toList();
    }

    private String buildSourceText(VisitRecord visit) {
        return String.join("\n",
            "Diagnosis: " + safe(visit.getDiagnosis()),
            "Disease history: " + safe(visit.getDiseaseHistory()),
            "Medications: " + safe(visit.getMedications())
        );
    }

    private String buildMetadataJson(VisitRecord visit) {
        return String.format(
            Locale.ROOT,
            "{\"visitId\":%d,\"patientId\":%d,\"doctorUserId\":%d,\"visitDate\":\"%s\"}",
            visit.getId(),
            visit.getPatientUserId(),
            visit.getDoctorUserId(),
            visit.getVisitDate()
        );
    }

    private String summaryQuery() {
        return "chronic conditions, recent diagnoses, current medications, follow-up trajectory";
    }

    private String formatContextLine(ClinicalEmbedding match) {
        return "- Visit " + match.getVisitId() + " | " + match.getSourceText();
    }

    private String fallbackSummary(List<ClinicalEmbedding> matches) {
        String diagnosisPart = matches.stream()
            .map(ClinicalEmbedding::getSourceText)
            .filter(Objects::nonNull)
            .map(text -> text.replace("\n", " | "))
            .limit(3)
            .collect(Collectors.joining("; "));

        return "Clinical summary based on retrieved history: " + diagnosisPart;
    }

    private float[] embedText(String text) {
        EmbeddingModel embeddingModel = embeddingModelProvider.getIfAvailable();
        if (embeddingModel != null) {
            try {
                return embeddingModel.embed(text);
            } catch (Exception ignored) {
                // Fall back to local embeddings when the external model is unavailable.
            }
        }

        return fallbackEmbedding(text);
    }

    private float[] fallbackEmbedding(String text) {
        float[] vector = new float[FALLBACK_DIMENSIONS];
        if (text == null || text.isBlank()) {
            return vector;
        }

        String normalized = text.toLowerCase(Locale.ROOT);
        for (String token : normalized.split("[^a-z0-9]+")) {
            if (token.isBlank()) {
                continue;
            }
            int index = Math.floorMod(token.hashCode(), FALLBACK_DIMENSIONS);
            vector[index] += 1.0f;
        }

        return vector;
    }

    private String serializeVector(float[] vector) {
        StringBuilder builder = new StringBuilder();
        for (int index = 0; index < vector.length; index++) {
            if (index > 0) {
                builder.append(',');
            }
            builder.append(vector[index]);
        }
        return builder.toString();
    }

    private float[] deserializeVector(String serialized) {
        if (serialized == null || serialized.isBlank()) {
            return new float[0];
        }

        String[] parts = serialized.split(",");
        float[] vector = new float[parts.length];
        for (int index = 0; index < parts.length; index++) {
            vector[index] = Float.parseFloat(parts[index]);
        }
        return vector;
    }

    private double cosineSimilarity(float[] left, float[] right) {
        int length = Math.min(left.length, right.length);
        if (length == 0) {
            return 0.0;
        }

        double dot = 0.0;
        double leftMagnitude = 0.0;
        double rightMagnitude = 0.0;

        for (int index = 0; index < length; index++) {
            dot += left[index] * right[index];
            leftMagnitude += left[index] * left[index];
            rightMagnitude += right[index] * right[index];
        }

        if (leftMagnitude == 0.0 || rightMagnitude == 0.0) {
            return 0.0;
        }

        return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "N/A" : value.trim();
    }

    private record ScoredEmbedding(ClinicalEmbedding record, double score) {}
}