package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.VisitDtos.VisitCreateRequest;
import com.doctpjt.clinicapp.dto.VisitDtos.VisitResponse;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class VisitService {

    private final VisitRecordRepository visitRecordRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicalEmbeddingService clinicalEmbeddingService;

    public VisitService(
        VisitRecordRepository visitRecordRepository,
        AppointmentRepository appointmentRepository,
        ClinicalEmbeddingService clinicalEmbeddingService
    ) {
        this.visitRecordRepository = visitRecordRepository;
        this.appointmentRepository = appointmentRepository;
        this.clinicalEmbeddingService = clinicalEmbeddingService;
    }

    public VisitResponse createVisit(VisitCreateRequest request) {
        Appointment appointment = appointmentRepository.findById(request.appointmentId())
            .orElseThrow(() -> new IllegalArgumentException("Appointment not found for visit"));

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot create visit for cancelled appointment");
        }
        if (appointment.getStatus() == AppointmentStatus.MISSED) {
            throw new IllegalArgumentException("Cannot create visit for missed appointment");
        }

        if (!appointment.getDoctorUserId().equals(request.doctorUserId())
            || !appointment.getPatientUserId().equals(request.patientUserId())) {
            throw new IllegalArgumentException("Visit doctor/patient does not match appointment");
        }

        VisitRecord visit = new VisitRecord();
        visit.setAppointmentId(request.appointmentId());
        visit.setDoctorUserId(request.doctorUserId());
        visit.setPatientUserId(request.patientUserId());
        visit.setVisitDate(request.visitDate());
        visit.setDiagnosis(request.diagnosis());
        visit.setDiseaseHistory(request.diseaseHistory());
        visit.setMedications(request.medications());
        visit.setRevisitDate(request.revisitDate());
        visit.setPrescriptionPhotoUrl(request.prescriptionPhotoUrl());

        // Mark appointment as COMPLETED
        appointment.setStatus(AppointmentStatus.COMPLETED);
        appointmentRepository.save(appointment);

        VisitRecord saved = visitRecordRepository.save(visit);
        clinicalEmbeddingService.embedVisit(saved);
        return toResponse(saved);
    }

    public List<VisitResponse> getPatientVisits(Long patientUserId) {
        return visitRecordRepository.findByPatientUserIdOrderByVisitDateDesc(patientUserId)
            .stream().map(this::toResponse).toList();
    }

    public List<VisitResponse> getDoctorPatientHistory(Long doctorUserId, Long patientUserId) {
        return visitRecordRepository.findByDoctorUserIdAndPatientUserIdOrderByVisitDateDesc(doctorUserId, patientUserId)
            .stream().map(this::toResponse).toList();
    }

    public VisitResponse updatePrescriptionUrl(Long visitId, String url) {
        VisitRecord visit = visitRecordRepository.findById(visitId)
            .orElseThrow(() -> new IllegalArgumentException("Visit record not found"));
        visit.setPrescriptionPhotoUrl(url);
        VisitRecord saved = visitRecordRepository.save(visit);
        return toResponse(saved);
    }

    private VisitResponse toResponse(VisitRecord visit) {
        return new VisitResponse(
            visit.getId(),
            visit.getAppointmentId(),
            visit.getDoctorUserId(),
            visit.getPatientUserId(),
            visit.getVisitDate(),
            visit.getDiagnosis(),
            visit.getDiseaseHistory(),
            visit.getMedications(),
            visit.getRevisitDate(),
            visit.getPrescriptionPhotoUrl()
        );
    }
}
