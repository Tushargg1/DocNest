package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.ConsentStatus;
import com.doctpjt.clinicapp.repository.ConsentRepository;
import java.time.LocalDateTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsentScheduledTasks {

    private final ConsentRepository consentRepository;
    private final AppointmentService appointmentService;

    public ConsentScheduledTasks(ConsentRepository consentRepository, AppointmentService appointmentService) {
        this.consentRepository = consentRepository;
        this.appointmentService = appointmentService;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expireStaleConsents() {
        consentRepository.expireActiveConsents(LocalDateTime.now(), ConsentStatus.ACTIVE, ConsentStatus.EXPIRED);
    }

    /**
     * Auto-mark unattended past appointments as MISSED every 30 minutes.
     */
    @Scheduled(fixedRate = 1800000) // 30 min
    @Transactional
    public void markMissedAppointments() {
        appointmentService.autoMarkMissedAppointments();
    }
}
