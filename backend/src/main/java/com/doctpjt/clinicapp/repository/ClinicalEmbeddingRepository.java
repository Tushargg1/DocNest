package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.ClinicalEmbedding;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicalEmbeddingRepository extends JpaRepository<ClinicalEmbedding, Long> {
    List<ClinicalEmbedding> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}