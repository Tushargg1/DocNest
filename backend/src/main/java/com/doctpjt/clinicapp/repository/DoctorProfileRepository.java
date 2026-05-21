package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.DoctorProfile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DoctorProfileRepository extends JpaRepository<DoctorProfile, Long> {
    Optional<DoctorProfile> findByUserId(Long userId);

    List<DoctorProfile> findByClinicId(Long clinicId);

    @Query("SELECT dp FROM DoctorProfile dp JOIN User u ON dp.userId = u.id " +
           "WHERE dp.approvalStatus = com.doctpjt.clinicapp.entity.DoctorApprovalStatus.ACTIVE " +
           "AND dp.clinicId IS NOT NULL " +
           "AND (LOWER(u.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(dp.specialization) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<DoctorProfile> searchByNameOrSpecialization(@Param("query") String query);
}
