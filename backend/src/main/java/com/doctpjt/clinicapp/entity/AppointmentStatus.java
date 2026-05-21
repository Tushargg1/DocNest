package com.doctpjt.clinicapp.entity;

public enum AppointmentStatus {
    BOOKED,       // Future appointment, not yet attended
    ATTENDED,     // Patient checked in at clinic
    COMPLETED,    // Visit completed (doctor wrote prescription)
    MISSED,       // Patient didn't show up; auto-set after appointment time passes
    CANCELLED     // Cancelled by patient/admin
}
