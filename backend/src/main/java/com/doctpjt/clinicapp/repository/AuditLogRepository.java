package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.AuditLog;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

	Optional<AuditLog> findTopByOrderByIdDesc();

	Optional<AuditLog> findTopByRowHashIsNotNullOrderByIdDesc();
}
