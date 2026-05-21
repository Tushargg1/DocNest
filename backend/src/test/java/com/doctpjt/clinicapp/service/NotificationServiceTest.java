package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.entity.Notification;
import com.doctpjt.clinicapp.entity.NotificationType;
import com.doctpjt.clinicapp.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private Notification sampleNotification;

    @BeforeEach
    void setUp() {
        sampleNotification = new Notification();
        sampleNotification.setId(1L);
        sampleNotification.setUserId(10L);
        sampleNotification.setType(NotificationType.APPOINTMENT_REMINDER);
        sampleNotification.setTitle("Appointment Confirmed");
        sampleNotification.setMessage("Your appointment with Dr. Smith is scheduled.");
        sampleNotification.setRead(false);
        sampleNotification.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("Create notification saves and returns notification")
    void createNotification_shouldSaveAndReturn() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        Notification result = notificationService.createNotification(
                10L, NotificationType.APPOINTMENT_REMINDER, "Test Title", "Test Message"
        );

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(10L);
        assertThat(result.getType()).isEqualTo(NotificationType.APPOINTMENT_REMINDER);
        assertThat(result.getTitle()).isEqualTo("Test Title");
        assertThat(result.getMessage()).isEqualTo("Test Message");
        assertThat(result.isRead()).isFalse();

        verify(notificationRepository).save(any(Notification.class));
    }

    @Test
    @DisplayName("Create appointment reminder notification with proper message")
    void createAppointmentReminder_shouldFormatMessageCorrectly() {
        LocalDateTime appointmentTime = LocalDateTime.of(2025, 3, 15, 10, 30);

        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification saved = inv.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        notificationService.createAppointmentReminder(10L, "Dr. Smith", appointmentTime);

        verify(notificationRepository).save(argThat(notification ->
                notification.getUserId().equals(10L) &&
                notification.getType() == NotificationType.APPOINTMENT_REMINDER &&
                notification.getTitle().equals("Appointment Confirmed") &&
                notification.getMessage().contains("Dr. Smith") &&
                notification.getMessage().contains("2025-03-15")
        ));
    }

    @Test
    @DisplayName("Mark notification as read succeeds for notification owner")
    void markAsRead_shouldSetReadTrue() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(sampleNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        Notification result = notificationService.markAsRead(1L, 10L);

        assertThat(result.isRead()).isTrue();
        verify(notificationRepository).save(sampleNotification);
    }

    @Test
    @DisplayName("Mark notification as read fails if not the owner")
    void markAsRead_notOwner_shouldThrow() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(sampleNotification));

        assertThatThrownBy(() -> notificationService.markAsRead(1L, 99L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Not authorized");

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mark notification as read fails if notification not found")
    void markAsRead_notFound_shouldThrow() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markAsRead(999L, 10L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Notification not found");
    }

    @Test
    @DisplayName("Mark all as read delegates to repository")
    void markAllAsRead_shouldDelegateToRepository() {
        when(notificationRepository.markAllAsRead(10L)).thenReturn(5);

        int result = notificationService.markAllAsRead(10L);

        assertThat(result).isEqualTo(5);
        verify(notificationRepository).markAllAsRead(10L);
    }

    @Test
    @DisplayName("Get unread count returns correct count")
    void getUnreadCount_shouldReturnCount() {
        when(notificationRepository.countByUserIdAndIsReadFalse(10L)).thenReturn(3L);

        long count = notificationService.getUnreadCount(10L);

        assertThat(count).isEqualTo(3L);
    }
}
