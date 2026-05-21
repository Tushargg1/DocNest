package com.doctpjt.clinicapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String address;

    private String phone;

    private Double latitude;

    private Double longitude;

    private Long ownerUserId;

    private boolean approved = false;

    @Column(columnDefinition = "TEXT")
    private String about;

    private String helpline;

    private String email;

    private String website;

    @Column(length = 500)
    private String googleMapsUrl;

    @Column(columnDefinition = "TEXT")
    private String photos;

    private String openingHours;

    @Column(length = 1000)
    private String services;
}
