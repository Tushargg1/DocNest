package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class MedicineReminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientUserId;

    private Long visitId;

    @Column(length = 500)
    private String medicineName;

    @Column(length = 200)
    private String dosage;

    @Column(length = 200)
    private String frequency;

    @Column(length = 100)
    private String duration;

    private LocalDate startDate;

    private LocalDate endDate;

    private int timesPerDay;

    private boolean active;

    private LocalDateTime createdAt;
}
