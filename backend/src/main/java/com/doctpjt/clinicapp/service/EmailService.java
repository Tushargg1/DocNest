package com.doctpjt.clinicapp.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("EEEE, dd MMM yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    private final JavaMailSender mailSender;

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${spring.mail.username:noreply@docnest.in}")
    private String fromAddress;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send appointment confirmation email to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentConfirmation(String toEmail, String patientName, String doctorName,
                                            String clinicName, LocalDateTime appointmentTime,
                                            String tokenNumber, String checkInCode) {
        if (!emailEnabled || toEmail == null || toEmail.isBlank()) {
            log.debug("Email notification skipped (enabled={}, to={})", emailEnabled, toEmail);
            return;
        }

        String subject = "Appointment Confirmed - DocNest";
        String body = buildConfirmationHtml(patientName, doctorName, clinicName, appointmentTime, tokenNumber, checkInCode);
        sendHtmlEmail(toEmail, subject, body);
    }

    /**
     * Send appointment cancellation email to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentCancellation(String toEmail, String patientName, String doctorName,
                                            String clinicName, LocalDateTime appointmentTime) {
        if (!emailEnabled || toEmail == null || toEmail.isBlank()) {
            log.debug("Email notification skipped (enabled={}, to={})", emailEnabled, toEmail);
            return;
        }

        String subject = "Appointment Cancelled - DocNest";
        String body = buildCancellationHtml(patientName, doctorName, clinicName, appointmentTime);
        sendHtmlEmail(toEmail, subject, body);
    }

    /**
     * Send appointment reschedule email to patient.
     */
    @Async("notificationExecutor")
    public void sendAppointmentReschedule(String toEmail, String patientName, String doctorName,
                                          String clinicName, LocalDateTime oldTime, LocalDateTime newTime) {
        if (!emailEnabled || toEmail == null || toEmail.isBlank()) {
            log.debug("Email notification skipped (enabled={}, to={})", emailEnabled, toEmail);
            return;
        }

        String subject = "Appointment Rescheduled - DocNest";
        String body = buildRescheduleHtml(patientName, doctorName, clinicName, oldTime, newTime);
        sendHtmlEmail(toEmail, subject, body);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email sent to {} [subject: {}]", to, subject);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error sending email to {}: {}", to, e.getMessage());
        }
    }

    // ─── HTML Templates ──────────────────────────────────────────────────────────

    private String buildConfirmationHtml(String patientName, String doctorName, String clinicName,
                                         LocalDateTime appointmentTime, String tokenNumber, String checkInCode) {
        return wrapInLayout("Appointment Confirmed",
            "<p style=\"font-size:16px;color:#334155;\">Hello <strong>" + esc(patientName) + "</strong>,</p>"
            + "<p style=\"font-size:15px;color:#475569;\">Your appointment has been confirmed. Here are the details:</p>"
            + "<table style=\"width:100%;border-collapse:collapse;margin:20px 0;\">"
            + detailRow("Doctor", esc(doctorName))
            + detailRow("Clinic", esc(clinicName))
            + detailRow("Date", appointmentTime.format(DATE_FMT))
            + detailRow("Time", appointmentTime.format(TIME_FMT))
            + detailRow("Token Number", "<strong style=\"font-size:18px;color:#0d9488;\">" + esc(tokenNumber) + "</strong>")
            + detailRow("Check-in Code", "<strong style=\"font-size:18px;color:#0d9488;letter-spacing:2px;\">" + esc(checkInCode) + "</strong>")
            + "</table>"
            + "<p style=\"font-size:14px;color:#64748b;\">Please arrive 10 minutes before your scheduled time. "
            + "Use the check-in code or scan the QR at the clinic to confirm your arrival.</p>"
        );
    }

    private String buildCancellationHtml(String patientName, String doctorName, String clinicName,
                                         LocalDateTime appointmentTime) {
        return wrapInLayout("Appointment Cancelled",
            "<p style=\"font-size:16px;color:#334155;\">Hello <strong>" + esc(patientName) + "</strong>,</p>"
            + "<p style=\"font-size:15px;color:#475569;\">Your appointment has been cancelled.</p>"
            + "<table style=\"width:100%;border-collapse:collapse;margin:20px 0;\">"
            + detailRow("Doctor", esc(doctorName))
            + detailRow("Clinic", esc(clinicName))
            + detailRow("Original Date", appointmentTime.format(DATE_FMT))
            + detailRow("Original Time", appointmentTime.format(TIME_FMT))
            + "</table>"
            + "<p style=\"font-size:14px;color:#64748b;\">If you did not request this cancellation, "
            + "please contact your clinic or book a new appointment through DocNest.</p>"
        );
    }

    private String buildRescheduleHtml(String patientName, String doctorName, String clinicName,
                                       LocalDateTime oldTime, LocalDateTime newTime) {
        return wrapInLayout("Appointment Rescheduled",
            "<p style=\"font-size:16px;color:#334155;\">Hello <strong>" + esc(patientName) + "</strong>,</p>"
            + "<p style=\"font-size:15px;color:#475569;\">Your appointment has been rescheduled to a new time.</p>"
            + "<table style=\"width:100%;border-collapse:collapse;margin:20px 0;\">"
            + detailRow("Doctor", esc(doctorName))
            + detailRow("Clinic", esc(clinicName))
            + detailRow("Previous Date", oldTime.format(DATE_FMT) + " at " + oldTime.format(TIME_FMT))
            + detailRow("New Date", "<strong style=\"color:#0d9488;\">" + newTime.format(DATE_FMT) + "</strong>")
            + detailRow("New Time", "<strong style=\"color:#0d9488;\">" + newTime.format(TIME_FMT) + "</strong>")
            + "</table>"
            + "<p style=\"font-size:14px;color:#64748b;\">Please update your calendar accordingly. "
            + "If you need to make further changes, visit DocNest.</p>"
        );
    }

    private String wrapInLayout(String heading, String content) {
        return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body style=\"margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;\">"
            + "<table style=\"width:100%;max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);\">"
            // Header
            + "<tr><td style=\"background:#0d9488;padding:24px 32px;\">"
            + "<h1 style=\"margin:0;font-size:22px;color:#ffffff;font-weight:600;\">DocNest</h1>"
            + "</td></tr>"
            // Body
            + "<tr><td style=\"padding:32px;\">"
            + "<h2 style=\"margin:0 0 16px;font-size:20px;color:#1e293b;\">" + heading + "</h2>"
            + content
            + "</td></tr>"
            // Footer
            + "<tr><td style=\"background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;\">"
            + "<p style=\"margin:0;font-size:12px;color:#94a3b8;text-align:center;\">"
            + "This is an automated message from DocNest. Please do not reply to this email.</p>"
            + "</td></tr>"
            + "</table></body></html>";
    }

    private String detailRow(String label, String value) {
        return "<tr>"
            + "<td style=\"padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;width:140px;\">" + label + "</td>"
            + "<td style=\"padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;\">" + value + "</td>"
            + "</tr>";
    }

    private String esc(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
