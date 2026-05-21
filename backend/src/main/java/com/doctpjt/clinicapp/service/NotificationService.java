package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Notification;
import com.doctpjt.clinicapp.entity.NotificationType;
import com.doctpjt.clinicapp.repository.NotificationRepository;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * Create a notification for a user.
     */
    public Notification createNotification(Long userId, NotificationType type, String title, String message) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    /**
     * Create an appointment reminder notification for the patient.
     */
    public void createAppointmentReminder(Long patientUserId, String doctorName, LocalDateTime appointmentTime) {
        String title = "Appointment Confirmed";
        String message = String.format(
            "Your appointment with %s is scheduled for %s.",
            doctorName,
            appointmentTime.toLocalDate() + " at " + appointmentTime.toLocalTime()
        );
        createNotification(patientUserId, NotificationType.APPOINTMENT_REMINDER, title, message);
    }

    /**
     * Create a revisit alert notification.
     */
    public void createRevisitAlert(Long patientUserId, String doctorName, String reason) {
        String title = "Follow-up Recommended";
        String message = String.format(
            "Dr. %s recommends a follow-up visit. Reason: %s",
            doctorName, reason
        );
        createNotification(patientUserId, NotificationType.REVISIT_ALERT, title, message);
    }

    /**
     * Create a reschedule confirmation notification for the patient.
     */
    public void createRescheduleNotification(Long patientUserId, String doctorName, LocalDateTime newTime) {
        String title = "Appointment Rescheduled";
        String message = String.format(
            "Your appointment with %s has been rescheduled to %s.",
            doctorName,
            newTime.toLocalDate() + " at " + newTime.toLocalTime()
        );
        createNotification(patientUserId, NotificationType.APPOINTMENT_RESCHEDULED, title, message);
    }

    /**
     * Get all notifications for a user (paginated).
     */
    public Page<Notification> getAllNotifications(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Get unread notification count for a user.
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    /**
     * Mark a single notification as read.
     */
    public Notification markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to modify this notification");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a user.
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsRead(userId);
    }
}
