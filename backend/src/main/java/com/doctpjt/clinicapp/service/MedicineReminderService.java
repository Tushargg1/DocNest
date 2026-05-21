package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.MedicineReminder;
import com.doctpjt.clinicapp.entity.NotificationType;
import com.doctpjt.clinicapp.entity.VisitRecord;
import com.doctpjt.clinicapp.repository.MedicineReminderRepository;
import com.doctpjt.clinicapp.repository.VisitRecordRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MedicineReminderService {

    private static final Logger log = LoggerFactory.getLogger(MedicineReminderService.class);

    private final MedicineReminderRepository reminderRepository;
    private final VisitRecordRepository visitRecordRepository;
    private final NotificationService notificationService;

    public MedicineReminderService(
        MedicineReminderRepository reminderRepository,
        VisitRecordRepository visitRecordRepository,
        NotificationService notificationService
    ) {
        this.reminderRepository = reminderRepository;
        this.visitRecordRepository = visitRecordRepository;
        this.notificationService = notificationService;
    }

    /**
     * Parse medications from a visit record and create reminder entries.
     * Expected format per medication: "Drug - Dosage - Frequency - Duration"
     * Multiple medications separated by newlines or semicolons.
     */
    @Transactional
    public List<MedicineReminder> createRemindersFromVisit(VisitRecord visit) {
        List<MedicineReminder> reminders = new ArrayList<>();

        if (visit.getMedications() == null || visit.getMedications().isBlank()) {
            return reminders;
        }

        String medicationsRaw = visit.getMedications().trim();
        // Split by newlines or semicolons
        String[] medications = medicationsRaw.split("[\\n;]+");

        for (String med : medications) {
            String trimmed = med.trim();
            if (trimmed.isEmpty()) continue;

            String[] parts = trimmed.split("\\s*-\\s*");
            if (parts.length < 2) {
                // If it can't be parsed, just use the whole string as medicine name
                MedicineReminder reminder = buildReminder(
                    visit, trimmed, "", "Once daily", "7 days"
                );
                reminders.add(reminderRepository.save(reminder));
                continue;
            }

            String medicineName = parts[0].trim();
            String dosage = parts.length >= 2 ? parts[1].trim() : "";
            String frequency = parts.length >= 3 ? parts[2].trim() : "Once daily";
            String duration = parts.length >= 4 ? parts[3].trim() : "7 days";

            // Combine drug name and dosage for display if dosage looks like a strength (e.g. "500mg")
            if (dosage.matches("\\d+\\s*(?:mg|ml|mcg|g|IU).*")) {
                medicineName = medicineName + " " + dosage;
                dosage = parts.length >= 3 ? parts[2].trim() : "1 tablet";
                frequency = parts.length >= 4 ? parts[3].trim() : "Once daily";
                duration = parts.length >= 5 ? parts[4].trim() : "7 days";
            }

            MedicineReminder reminder = buildReminder(visit, medicineName, dosage, frequency, duration);
            reminders.add(reminderRepository.save(reminder));
        }

        // Send a notification to the patient
        if (!reminders.isEmpty()) {
            String title = "Medicine Schedule Created";
            String message = String.format(
                "%d medication(s) added to your reminders from your visit on %s.",
                reminders.size(), visit.getVisitDate()
            );
            notificationService.createNotification(
                visit.getPatientUserId(), NotificationType.MEDICINE_REMINDER, title, message
            );
        }

        return reminders;
    }

    private MedicineReminder buildReminder(VisitRecord visit, String medicineName, String dosage, String frequency, String duration) {
        MedicineReminder reminder = new MedicineReminder();
        reminder.setPatientUserId(visit.getPatientUserId());
        reminder.setVisitId(visit.getId());
        reminder.setMedicineName(medicineName);
        reminder.setDosage(dosage);
        reminder.setFrequency(frequency);
        reminder.setDuration(duration);
        reminder.setStartDate(visit.getVisitDate() != null ? visit.getVisitDate() : LocalDate.now());
        reminder.setEndDate(calculateEndDate(reminder.getStartDate(), duration));
        reminder.setTimesPerDay(parseTimesPerDay(frequency));
        reminder.setActive(true);
        reminder.setCreatedAt(LocalDateTime.now());
        return reminder;
    }

    /**
     * Get all active reminders for a patient, deactivating expired ones first.
     */
    public List<MedicineReminder> getActiveReminders(Long patientUserId) {
        deactivateExpiredReminders();
        return reminderRepository.findByPatientUserIdAndActiveTrueOrderByEndDateAsc(patientUserId);
    }

    /**
     * Get all reminders (active + past) for a patient.
     */
    public List<MedicineReminder> getAllReminders(Long patientUserId) {
        deactivateExpiredReminders();
        return reminderRepository.findByPatientUserIdOrderByCreatedAtDesc(patientUserId);
    }

    /**
     * Get reminders for a specific visit.
     */
    public List<MedicineReminder> getRemindersForVisit(Long visitId) {
        return reminderRepository.findByVisitId(visitId);
    }

    /**
     * Deactivate a reminder manually (patient stops early).
     */
    public MedicineReminder deactivateReminder(Long reminderId, Long patientUserId) {
        MedicineReminder reminder = reminderRepository.findById(reminderId)
            .orElseThrow(() -> new IllegalArgumentException("Reminder not found"));
        if (!reminder.getPatientUserId().equals(patientUserId)) {
            throw new IllegalArgumentException("Not authorized to modify this reminder");
        }
        reminder.setActive(false);
        return reminderRepository.save(reminder);
    }

    /**
     * Generate reminders from an existing visit (manual trigger).
     */
    @Transactional
    public List<MedicineReminder> generateFromVisit(Long visitId, Long patientUserId) {
        VisitRecord visit = visitRecordRepository.findById(visitId)
            .orElseThrow(() -> new IllegalArgumentException("Visit not found"));
        if (!visit.getPatientUserId().equals(patientUserId)) {
            throw new IllegalArgumentException("Not authorized for this visit");
        }
        // Remove existing reminders for this visit before regenerating
        List<MedicineReminder> existing = reminderRepository.findByVisitId(visitId);
        if (!existing.isEmpty()) {
            reminderRepository.deleteAll(existing);
        }
        return createRemindersFromVisit(visit);
    }

    /**
     * Deactivate all expired reminders.
     */
    @Transactional
    public void deactivateExpiredReminders() {
        reminderRepository.deactivateExpired(LocalDate.now());
    }

    private LocalDate calculateEndDate(LocalDate startDate, String duration) {
        if (duration == null || duration.isBlank()) {
            return startDate.plusDays(7);
        }
        String lower = duration.toLowerCase().trim();
        try {
            // Extract number from strings like "5 days", "2 weeks", "1 month"
            String numStr = lower.replaceAll("[^0-9]", "");
            int num = numStr.isEmpty() ? 7 : Integer.parseInt(numStr);

            if (lower.contains("week")) {
                return startDate.plusWeeks(num);
            } else if (lower.contains("month")) {
                return startDate.plusMonths(num);
            } else {
                return startDate.plusDays(num);
            }
        } catch (NumberFormatException e) {
            log.warn("Could not parse duration '{}', defaulting to 7 days", duration);
            return startDate.plusDays(7);
        }
    }

    private int parseTimesPerDay(String frequency) {
        if (frequency == null) return 1;
        String lower = frequency.toLowerCase().trim();
        if (lower.contains("three") || lower.contains("thrice") || lower.contains("3 times")) {
            return 3;
        } else if (lower.contains("twice") || lower.contains("two") || lower.contains("2 times")) {
            return 2;
        } else if (lower.contains("four") || lower.contains("4 times")) {
            return 4;
        }
        return 1;
    }
}
