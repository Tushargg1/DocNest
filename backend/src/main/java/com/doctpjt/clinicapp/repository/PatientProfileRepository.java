package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.PatientProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientProfileRepository extends JpaRepository<PatientProfile, Long> {
    Optional<PatientProfile> findFirstByUserId(Long userId);
    Optional<PatientProfile> findByUserId(Long userId);
}
