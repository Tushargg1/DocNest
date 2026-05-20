package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.DoctorDegree;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorDegreeRepository extends JpaRepository<DoctorDegree, Long> {
    List<DoctorDegree> findByDoctorUserId(Long doctorUserId);
    List<DoctorDegree> findByDoctorUserIdIn(List<Long> doctorUserIds);
}
