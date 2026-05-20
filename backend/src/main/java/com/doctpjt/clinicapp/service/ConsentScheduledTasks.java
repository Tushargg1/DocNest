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

    public ConsentScheduledTasks(ConsentRepository consentRepository) {
        this.consentRepository = consentRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void expireStaleConsents() {
        consentRepository.expireActiveConsents(LocalDateTime.now(), ConsentStatus.ACTIVE, ConsentStatus.EXPIRED);
    }
}
