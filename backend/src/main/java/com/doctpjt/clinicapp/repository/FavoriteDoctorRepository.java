package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.FavoriteDoctor;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteDoctorRepository extends JpaRepository<FavoriteDoctor, Long> {

    List<FavoriteDoctor> findByPatientUserId(Long patientUserId);

    Optional<FavoriteDoctor> findByPatientUserIdAndDoctorUserId(Long patientUserId, Long doctorUserId);

    boolean existsByPatientUserIdAndDoctorUserId(Long patientUserId, Long doctorUserId);

    void deleteByPatientUserIdAndDoctorUserId(Long patientUserId, Long doctorUserId);
}
