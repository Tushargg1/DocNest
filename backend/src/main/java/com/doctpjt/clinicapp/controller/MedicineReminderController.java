package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.entity.MedicineReminder;
import com.doctpjt.clinicapp.service.MedicineReminderService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/medicine-reminders")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class MedicineReminderController {

    private final MedicineReminderService reminderService;

    public MedicineReminderController(MedicineReminderService reminderService) {
        this.reminderService = reminderService;
    }

    /**
     * Get all active reminders for the logged-in patient.
     */
    @GetMapping
    @PreAuthorize("hasRole('PATIENT')")
    public List<MedicineReminder> getActiveReminders(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        return reminderService.getActiveReminders(userId);
    }

    /**
     * Get all reminders (active + past) for the logged-in patient.
     */
    @GetMapping("/all")
    @PreAuthorize("hasRole('PATIENT')")
    public List<MedicineReminder> getAllReminders(Authentication authentication) {
        Long userId = Long.valueOf(authentication.getName());
        return reminderService.getAllReminders(userId);
    }

    /**
     * Manually deactivate (stop) a reminder early.
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('PATIENT')")
    public MedicineReminder deactivateReminder(
        @PathVariable Long id,
        Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());
        return reminderService.deactivateReminder(id, userId);
    }

    /**
     * Manually generate reminders from a visit record.
     */
    @PostMapping("/generate/{visitId}")
    @PreAuthorize("hasRole('PATIENT')")
    public List<MedicineReminder> generateFromVisit(
        @PathVariable Long visitId,
        Authentication authentication
    ) {
        Long userId = Long.valueOf(authentication.getName());
        return reminderService.generateFromVisit(visitId, userId);
    }
}
