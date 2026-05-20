package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    @NotNull(message = "User ID is required")
    private Long userId;

    private Long clinicId;

    @Enumerated(EnumType.STRING)
    private DoctorApprovalStatus approvalStatus = DoctorApprovalStatus.ACTIVE;

    @NotBlank(message = "Specialization is required")
    private String specialization;

    private String bio;

    private Integer slotDurationMinutes = 20;

    @NotBlank(message = "Work start time is required")
    private String workStart = "09:00";

    @NotBlank(message = "Work end time is required")
    private String workEnd = "17:00";

    private String roomId;

    private Integer age;

    private String gender;

    private String occupation;
}
