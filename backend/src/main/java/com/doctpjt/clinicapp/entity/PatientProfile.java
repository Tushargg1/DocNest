package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PatientProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private Long userId;

    private String bloodGroup;

    private String allergies;

    private String emergencyContact;

    private Integer age;

    private String gender;

    private Double height;

    private Double weight;

    @Column(columnDefinition = "TEXT")
    private String medicalHistory;

    // Current medications patient is taking (for drug interaction check by doctor)
    @Column(columnDefinition = "TEXT")
    private String currentMedications;

    private String abhaId;
}

