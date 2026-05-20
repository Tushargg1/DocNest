package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.Rating;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    List<Rating> findByDoctorUserId(Long doctorUserId);
    List<Rating> findByDoctorUserIdIn(List<Long> doctorUserIds);
}
