package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "doctor_leaves")
@Getter
@Setter
public class DoctorLeave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long doctorUserId;

    @Column(nullable = false)
    private LocalDate leaveDate;

    private String reason;

    // If true, all existing BOOKED appointments on this day should be auto-cancelled
    private boolean cancelAppointments = true;
}
