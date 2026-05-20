package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.Clinic;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClinicRepository extends JpaRepository<Clinic, Long> {
    List<Clinic> findByOwnerUserId(Long ownerUserId);
    List<Clinic> findByApproved(boolean approved);
}
