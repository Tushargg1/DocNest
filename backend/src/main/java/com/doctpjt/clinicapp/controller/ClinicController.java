package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicCreateRequest;
import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicDoctorResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.ClinicPatientResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorCardResponse;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorRegisterByClinicRequest;
import com.doctpjt.clinicapp.dto.ClinicDtos.DoctorUpdateByClinicRequest;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.dto.WorkspaceDtos.ClinicDashboardResponse;
import com.doctpjt.clinicapp.service.ClinicService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clinics")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class ClinicController {

    private final ClinicService clinicService;

    public ClinicController(ClinicService clinicService) {
        this.clinicService = clinicService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (#request.ownerUserId == principal and hasRole('CLINIC'))")
    public Clinic createClinic(@Valid @RequestBody ClinicCreateRequest request) {
        return clinicService.createClinic(request);
    }

    @GetMapping("/owner/{ownerUserId}")
    @PreAuthorize("hasRole('ADMIN') or (#ownerUserId == principal and hasRole('CLINIC'))")
    public List<Clinic> listClinicsByOwner(@PathVariable Long ownerUserId) {
        return clinicService.getClinicsByOwner(ownerUserId);
    }

    @GetMapping("/{id}/doctors")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public List<ClinicDoctorResponse> getClinicDoctors(@PathVariable Long id) {
        return clinicService.getClinicDoctors(id);
    }

    @GetMapping("/{id}/dashboard")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public ClinicDashboardResponse getClinicDashboard(@PathVariable Long id) {
        return clinicService.getClinicDashboard(id);
    }

    @PostMapping("/{id}/doctors/{doctorUserId}/approve")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public ClinicDoctorResponse approveDoctor(@PathVariable Long id, @PathVariable Long doctorUserId) {
        return clinicService.approveDoctorProfile(id, doctorUserId);
    }

    @PutMapping("/{id}/doctors/{doctorUserId}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public ClinicDoctorResponse updateDoctor(@PathVariable Long id, @PathVariable Long doctorUserId, @Valid @RequestBody DoctorUpdateByClinicRequest request) {
        return clinicService.updateDoctorByClinic(id, doctorUserId, request);
    }

    @PostMapping("/{id}/doctors/{doctorUserId}/remove")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public void removeDoctor(@PathVariable Long id, @PathVariable Long doctorUserId) {
        clinicService.removeDoctorFromClinic(id, doctorUserId);
    }

    @GetMapping("/nearby-doctors")
    public List<DoctorCardResponse> nearbyDoctors(@RequestParam double latitude, @RequestParam double longitude) {
        return clinicService.getNearbyDoctors(latitude, longitude);
    }

    @GetMapping("/doctor/{doctorUserId}")
    public DoctorCardResponse getDoctorDetail(@PathVariable Long doctorUserId) {
        return clinicService.getDoctorDetail(doctorUserId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public Clinic updateClinic(@PathVariable Long id, @RequestBody Clinic request) {
        return clinicService.updateClinic(id, request);
    }

    @PostMapping("/{id}/doctors")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('CLINIC') and @clinicService.isClinicOwnedBy(#id, principal))")
    public ClinicDoctorResponse registerDoctor(@PathVariable Long id, @Valid @RequestBody DoctorRegisterByClinicRequest request) {
        return clinicService.registerDoctorByClinic(id, request);
    }
}
