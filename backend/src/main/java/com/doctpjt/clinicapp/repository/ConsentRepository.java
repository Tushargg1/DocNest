package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.Consent;
import com.doctpjt.clinicapp.entity.ConsentStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsentRepository extends JpaRepository<Consent, Long> {

    Optional<Consent> findFirstByPatientIdAndDoctorIdAndStatusAndStartTimeLessThanEqualAndExpiryTimeGreaterThanEqual(
        Long patientId,
        Long doctorId,
        ConsentStatus status,
        LocalDateTime startTime,
        LocalDateTime expiryTime
    );

    Optional<Consent> findFirstByPatientIdAndDoctorIdAndStatusOrderByIdDesc(
        Long patientId,
        Long doctorId,
        ConsentStatus status
    );

    boolean existsByPatientIdAndDoctorIdAndStatusAndStartTimeLessThanEqualAndExpiryTimeGreaterThanEqual(
        Long patientId,
        Long doctorId,
        ConsentStatus status,
        LocalDateTime startTime,
        LocalDateTime expiryTime
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Consent c
        set c.status = :revokedStatus,
            c.expiryTime = :revokedAt
        where c.patientId = :patientId
          and c.status in :statuses
        """)
    int revokeByPatientIdAndStatusIn(
        @Param("patientId") Long patientId,
        @Param("statuses") List<ConsentStatus> statuses,
        @Param("revokedStatus") ConsentStatus revokedStatus,
        @Param("revokedAt") LocalDateTime revokedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
        update Consent c
        set c.status = :expiredStatus
        where c.status = :activeStatus
          and c.expiryTime is not null
          and c.expiryTime < :now
        """)
    int expireActiveConsents(
        @Param("now") LocalDateTime now,
        @Param("activeStatus") ConsentStatus activeStatus,
        @Param("expiredStatus") ConsentStatus expiredStatus
    );
}