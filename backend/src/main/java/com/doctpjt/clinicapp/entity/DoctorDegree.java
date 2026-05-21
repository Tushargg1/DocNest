package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class DoctorDegree {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long doctorUserId;

    @NotBlank(message = "Degree name is required")
    private String degreeName;

    @NotBlank(message = "Institute is required")
    private String institute;

    @NotNull(message = "Year of completion is required")
    @Min(1900)
    @Max(2100)
    private Integer yearOfCompletion;

    @jakarta.persistence.Column(columnDefinition = "LONGTEXT")
    private String certificateUrl;
}
