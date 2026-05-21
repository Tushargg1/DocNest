package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "appointments", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"doctorUserId", "startTime", "status"})
})
@Getter
@Setter
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long doctorUserId;

    private Long patientUserId;

    private Long clinicId;

    private String tokenNumber;

    // Unique short code for QR check-in (6 chars)
    @Column(length = 12)
    private String checkInCode;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status = AppointmentStatus.BOOKED;

    // Tracks whether the patient submitted a post-visit review
    private boolean reviewed = false;

    // Tracks whether patient confirmed they attended
    private Boolean attendedConfirmed;
}

