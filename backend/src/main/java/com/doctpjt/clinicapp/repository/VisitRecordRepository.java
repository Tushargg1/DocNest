package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.VisitRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitRecordRepository extends JpaRepository<VisitRecord, Long> {
    List<VisitRecord> findByPatientUserIdOrderByVisitDateDesc(Long patientUserId);

    List<VisitRecord> findByDoctorUserIdAndPatientUserIdOrderByVisitDateDesc(Long doctorUserId, Long patientUserId);

    List<VisitRecord> findByDoctorUserIdOrderByVisitDateDesc(Long doctorUserId);

    List<VisitRecord> findByAppointmentIdIn(List<Long> appointmentIds);
}
