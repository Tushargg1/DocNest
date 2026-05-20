package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.DoctorProfile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);

    List<DoctorProfile> findByClinicId(Long clinicId);
}
