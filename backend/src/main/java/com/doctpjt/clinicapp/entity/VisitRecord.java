package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class VisitRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long appointmentId;

    private Long doctorUserId;

    private Long patientUserId;

    private LocalDate visitDate;

    @Column(length = 2000)
    private String diagnosis;

    @Column(length = 2000)
    private String diseaseHistory;

    @Column(length = 2000)
    private String medications;

    // Follow-up date prescribed by doctor
    private LocalDate revisitDate;

    // URL to uploaded prescription photo
    @Column(length = 1000)
    private String prescriptionPhotoUrl;
}

