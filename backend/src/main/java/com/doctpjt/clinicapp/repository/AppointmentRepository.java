package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByDoctorUserIdAndStartTimeBetween(Long doctorUserId, LocalDateTime start, LocalDateTime end);

    List<Appointment> findByPatientUserId(Long patientUserId);

    List<Appointment> findByDoctorUserId(Long doctorUserId);

    List<Appointment> findByClinicId(Long clinicId);

    List<Appointment> findByClinicIdAndStartTimeBetween(Long clinicId, LocalDateTime start, LocalDateTime end);

    List<Appointment> findByClinicIdAndPatientUserId(Long clinicId, Long patientUserId);

    List<Appointment> findByDoctorUserIdAndStatusIn(Long doctorUserId, List<AppointmentStatus> statuses);

    boolean existsByDoctorUserIdAndStartTimeAndStatus(Long doctorUserId, LocalDateTime startTime, AppointmentStatus status);
}
