package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.DoctorLeave;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorLeaveRepository extends JpaRepository<DoctorLeave, Long> {

    List<DoctorLeave> findByDoctorUserId(Long doctorUserId);

    List<DoctorLeave> findByDoctorUserIdAndLeaveDateGreaterThanEqual(Long doctorUserId, LocalDate fromDate);

    boolean existsByDoctorUserIdAndLeaveDate(Long doctorUserId, LocalDate leaveDate);
}
