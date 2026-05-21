package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.MedicineReminder;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MedicineReminderRepository extends JpaRepository<MedicineReminder, Long> {

    List<MedicineReminder> findByPatientUserIdAndActiveTrueOrderByEndDateAsc(Long patientUserId);

    List<MedicineReminder> findByPatientUserIdOrderByCreatedAtDesc(Long patientUserId);

    List<MedicineReminder> findByVisitId(Long visitId);

    @Modifying
    @Transactional
    @Query("UPDATE MedicineReminder m SET m.active = false WHERE m.active = true AND m.endDate < :today")
    int deactivateExpired(LocalDate today);
}
