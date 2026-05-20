package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "favorite_doctors", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"patientUserId", "doctorUserId"})
})
@Getter
@Setter
public class FavoriteDoctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientUserId;

    private Long doctorUserId;

    private LocalDateTime createdAt = LocalDateTime.now();
}
