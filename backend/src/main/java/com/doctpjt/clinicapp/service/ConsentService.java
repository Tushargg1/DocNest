package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Consent;
import com.doctpjt.clinicapp.entity.ConsentStatus;
import com.doctpjt.clinicapp.repository.ConsentRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ConsentService {

    private static final int DEFAULT_CONSENT_HOURS = 24;
    private static final String ACCESS_DENIED_MESSAGE = "Access denied. Please request consent from the patient.";

    private final ConsentRepository consentRepository;

    public ConsentService(ConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    public Consent requestConsent(Long patientId, Long doctorId) {
        LocalDateTime now = LocalDateTime.now();
        boolean alreadyActive = consentRepository.existsByPatientIdAndDoctorIdAndStatusAndStartTimeLessThanEqualAndExpiryTimeGreaterThanEqual(
            patientId,
            doctorId,
            ConsentStatus.ACTIVE,
            now,
            now
        );
        if (alreadyActive) {
            return consentRepository
                .findFirstByPatientIdAndDoctorIdAndStatusAndStartTimeLessThanEqualAndExpiryTimeGreaterThanEqual(
                    patientId,
                    doctorId,
                    ConsentStatus.ACTIVE,
                    now,
                    now
                )
                .orElseThrow(() -> new IllegalStateException("Active consent lookup failed unexpectedly"));
        }

        Consent pending = consentRepository
            .findFirstByPatientIdAndDoctorIdAndStatusOrderByIdDesc(patientId, doctorId, ConsentStatus.PENDING)
            .orElse(null);
        if (pending != null) {
            return pending;
        }

        Consent consent = new Consent();
        consent.setPatientId(patientId);
        consent.setDoctorId(doctorId);
        consent.setStatus(ConsentStatus.PENDING);
        return consentRepository.save(consent);
    }

    public Consent approveConsent(Long consentId, Long patientId, Integer durationHours) {
        Consent consent = consentRepository.findById(consentId)
            .orElseThrow(() -> new IllegalArgumentException("Consent request not found"));

        if (!consent.getPatientId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only approve your own consent requests");
        }

        if (consent.getStatus() != ConsentStatus.PENDING) {
            throw new IllegalArgumentException("Only pending consent can be approved");
        }

        int hours = (durationHours == null || durationHours <= 0) ? DEFAULT_CONSENT_HOURS : durationHours;
        LocalDateTime now = LocalDateTime.now();
        consent.setStatus(ConsentStatus.ACTIVE);
        consent.setStartTime(now);
        consent.setExpiryTime(now.plusHours(hours));
        return consentRepository.save(consent);
    }

    public boolean hasActiveConsent(Long patientId, Long doctorId) {
        LocalDateTime now = LocalDateTime.now();
        return consentRepository.existsByPatientIdAndDoctorIdAndStatusAndStartTimeLessThanEqualAndExpiryTimeGreaterThanEqual(
            patientId,
            doctorId,
            ConsentStatus.ACTIVE,
            now,
            now
        );
    }

    public void assertActiveConsent(Long patientId, Long doctorId) {
        if (!hasActiveConsent(patientId, doctorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE);
        }
    }

    @Transactional
    public int revokeAllForPatient(Long patientId) {
        return consentRepository.revokeByPatientIdAndStatusIn(
            patientId,
            List.of(ConsentStatus.ACTIVE, ConsentStatus.PENDING),
            ConsentStatus.REVOKED,
            LocalDateTime.now()
        );
    }
}