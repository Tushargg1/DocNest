package com.doctpjt.clinicapp.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * SMS notification service (stub implementation).
 * Logs SMS content for development. Replace with Twilio/MSG91/other provider for production.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    @Value("${app.notifications.sms.enabled:false}")
    private boolean smsEnabled;

    /**
     * Send appointment confirmation SMS to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentConfirmation(String phoneNumber, String patientName, String doctorName,
                                            LocalDateTime appointmentTime, String tokenNumber) {
        String message = String.format(
            "Hi %s, your appointment with %s on %s at %s is confirmed. Token: %s. - DocNest",
            patientName, doctorName,
            appointmentTime.format(DATE_FMT),
            appointmentTime.format(TIME_FMT),
            tokenNumber
        );
        sendSms(phoneNumber, message);
    }

    /**
     * Send appointment cancellation SMS to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentCancellation(String phoneNumber, String patientName, String doctorName,
                                            LocalDateTime appointmentTime) {
        String message = String.format(
            "Hi %s, your appointment with %s on %s at %s has been cancelled. Book again on DocNest.",
            patientName, doctorName,
            appointmentTime.format(DATE_FMT),
            appointmentTime.format(TIME_FMT)
        );
        sendSms(phoneNumber, message);
    }

    /**
     * Send appointment reschedule SMS to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentReschedule(String phoneNumber, String patientName, String doctorName,
                                          LocalDateTime newTime) {
        String message = String.format(
            "Hi %s, your appointment with %s has been rescheduled to %s at %s. - DocNest",
            patientName, doctorName,
            newTime.format(DATE_FMT),
            newTime.format(TIME_FMT)
        );
        sendSms(phoneNumber, message);
    }

    /**
     * Send appointment reminder SMS (e.g., day-before reminder).
     */
    @Async("notificationExecutor")
    public void sendAppointmentReminder(String phoneNumber, String patientName, String doctorName,
                                        LocalDateTime appointmentTime) {
        String message = String.format(
            "Reminder: Hi %s, you have an appointment with %s tomorrow at %s. Please arrive 10 min early. - DocNest",
            patientName, doctorName,
            appointmentTime.format(TIME_FMT)
        );
        sendSms(phoneNumber, message);
    }

    /**
     * Stub implementation — logs the SMS content.
     * Replace with actual SMS provider (Twilio, MSG91, etc.) for production.
     */
    private void sendSms(String phoneNumber, String message) {
        if (!smsEnabled || phoneNumber == null || phoneNumber.isBlank()) {
            log.debug("SMS notification skipped (enabled={}, phone={})", smsEnabled, phoneNumber);
            return;
        }

        // TODO: Replace with actual SMS API call (e.g., Twilio)
        // twilioClient.messages().create(
        //     new PhoneNumber(phoneNumber),
        //     new PhoneNumber(fromNumber),
        //     message
        // );

        log.info("[SMS STUB] To: {} | Message: {}", phoneNumber, message);
    }
}
