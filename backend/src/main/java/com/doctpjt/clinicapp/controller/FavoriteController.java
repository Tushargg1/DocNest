package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.FavoriteDoctor;
import com.doctpjt.clinicapp.repository.FavoriteDoctorRepository;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    private final FavoriteDoctorRepository favoriteDoctorRepository;

    public FavoriteController(FavoriteDoctorRepository favoriteDoctorRepository) {
        this.favoriteDoctorRepository = favoriteDoctorRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('PATIENT')")
    public List<FavoriteDoctor> getMyFavorites(Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        return favoriteDoctorRepository.findByPatientUserId(patientUserId);
    }

    @PostMapping("/{doctorUserId}")
    @PreAuthorize("hasRole('PATIENT')")
    public FavoriteDoctor addFavorite(@PathVariable Long doctorUserId, Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        if (favoriteDoctorRepository.existsByPatientUserIdAndDoctorUserId(patientUserId, doctorUserId)) {
            return favoriteDoctorRepository.findByPatientUserIdAndDoctorUserId(patientUserId, doctorUserId).orElseThrow();
        }
        FavoriteDoctor fav = new FavoriteDoctor();
        fav.setPatientUserId(patientUserId);
        fav.setDoctorUserId(doctorUserId);
        return favoriteDoctorRepository.save(fav);
    }

    @DeleteMapping("/{doctorUserId}")
    @Transactional
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, String> removeFavorite(@PathVariable Long doctorUserId, Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        favoriteDoctorRepository.deleteByPatientUserIdAndDoctorUserId(patientUserId, doctorUserId);
        return Map.of("status", "removed");
    }

    @GetMapping("/check/{doctorUserId}")
    @PreAuthorize("hasRole('PATIENT')")
    public Map<String, Boolean> isFavorite(@PathVariable Long doctorUserId, Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        boolean isFav = favoriteDoctorRepository.existsByPatientUserIdAndDoctorUserId(patientUserId, doctorUserId);
        return Map.of("isFavorite", isFav);
    }
}
