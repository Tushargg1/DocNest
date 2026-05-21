package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.AppointmentDtos.AppointmentResponse;
import com.doctpjt.clinicapp.dto.AppointmentDtos.BookAppointmentRequest;
import com.doctpjt.clinicapp.entity.Appointment;
import com.doctpjt.clinicapp.entity.AppointmentStatus;
import com.doctpjt.clinicapp.entity.Clinic;
import com.doctpjt.clinicapp.entity.DoctorApprovalStatus;
import com.doctpjt.clinicapp.entity.DoctorProfile;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.AppointmentRepository;
import com.doctpjt.clinicapp.repository.ClinicRepository;
import com.doctpjt.clinicapp.repository.DoctorLeaveRepository;
import com.doctpjt.clinicapp.repository.DoctorProfileRepository;
import com.doctpjt.clinicapp.repository.RatingRepository;
import com.doctpjt.clinicapp.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private DoctorProfileRepository doctorProfileRepository;
    @Mock private ClinicRepository clinicRepository;
    @Mock private RatingRepository ratingRepository;
    @Mock private DoctorLeaveRepository doctorLeaveRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private SmsService smsService;

    @InjectMocks
    private AppointmentService appointmentService;

    private DoctorProfile doctorProfile;
    private Clinic clinic;

    @BeforeEach
    void setUp() {
        doctorProfile = new DoctorProfile();
        doctorProfile.setUserId(1L);
        doctorProfile.setApprovalStatus(DoctorApprovalStatus.ACTIVE);
        doctorProfile.setClinicId(10L);
        doctorProfile.setSlotDurationMinutes(20);
        doctorProfile.setWorkStart("09:00");
        doctorProfile.setWorkEnd("17:00");
        doctorProfile.setSpecialization("Cardiology");

        clinic = new Clinic();
        clinic.setId(10L);
        clinic.setName("Test Clinic");
        clinic.setApproved(true);
    }

    @Test
    @DisplayName("Book appointment with valid data succeeds")
    void book_withValidData_shouldSucceed() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        BookAppointmentRequest request = new BookAppointmentRequest(1L, 2L, 10L, futureTime);

        when(doctorProfileRepository.findByUserId(1L)).thenReturn(Optional.of(doctorProfile));
        when(clinicRepository.findById(10L)).thenReturn(Optional.of(clinic));
        when(appointmentRepository.existsByDoctorUserIdAndStartTimeAndStatus(1L, futureTime, AppointmentStatus.BOOKED))
                .thenReturn(false);
        when(appointmentRepository.findByClinicIdAndStartTimeBetween(eq(10L), any(), any()))
                .thenReturn(List.of());
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });
        when(userRepository.findById(1L)).thenReturn(Optional.of(createUser(1L, "Dr. Smith")));
        when(userRepository.findById(2L)).thenReturn(Optional.of(createUser(2L, "Patient Joe")));

        AppointmentResponse response = appointmentService.book(request);

        assertThat(response).isNotNull();
        assertThat(response.appointmentId()).isEqualTo(100L);
        assertThat(response.doctorUserId()).isEqualTo(1L);
        assertThat(response.patientUserId()).isEqualTo(2L);
        assertThat(response.clinicId()).isEqualTo(10L);
        assertThat(response.status()).isEqualTo("BOOKED");
        assertThat(response.startTime()).isEqualTo(futureTime);
        assertThat(response.endTime()).isEqualTo(futureTime.plusMinutes(20));

        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("Book appointment fails when slot is already taken")
    void book_whenSlotAlreadyTaken_shouldThrow() {
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        BookAppointmentRequest request = new BookAppointmentRequest(1L, 2L, 10L, futureTime);

        when(doctorProfileRepository.findByUserId(1L)).thenReturn(Optional.of(doctorProfile));
        when(clinicRepository.findById(10L)).thenReturn(Optional.of(clinic));
        when(appointmentRepository.existsByDoctorUserIdAndStartTimeAndStatus(1L, futureTime, AppointmentStatus.BOOKED))
                .thenReturn(true);

        assertThatThrownBy(() -> appointmentService.book(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Slot already booked");

        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Cancel appointment sets status to CANCELLED")
    void cancelAppointment_shouldSetStatusToCancelled() {
        Appointment appointment = new Appointment();
        appointment.setId(1L);
        appointment.setPatientUserId(2L);
        appointment.setDoctorUserId(1L);
        appointment.setClinicId(10L);
        appointment.setStatus(AppointmentStatus.BOOKED);
        appointment.setStartTime(LocalDateTime.now().plusDays(1));
        appointment.setEndTime(LocalDateTime.now().plusDays(1).plusMinutes(20));
        appointment.setTokenNumber("C001");
        appointment.setCheckInCode("ABC123");

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findById(2L)).thenReturn(Optional.of(createUser(2L, "Patient")));
        when(userRepository.findById(1L)).thenReturn(Optional.of(createUser(1L, "Doctor")));
        when(clinicRepository.findById(10L)).thenReturn(Optional.of(clinic));

        AppointmentResponse response = appointmentService.cancelAppointment(1L, 2L, false);

        assertThat(response.status()).isEqualTo("CANCELLED");
        verify(appointmentRepository).save(any(Appointment.class));
    }

    @Test
    @DisplayName("Cancel appointment fails if already cancelled")
    void cancelAppointment_alreadyCancelled_shouldThrow() {
        Appointment appointment = new Appointment();
        appointment.setId(1L);
        appointment.setPatientUserId(2L);
        appointment.setStatus(AppointmentStatus.CANCELLED);

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.cancelAppointment(1L, 2L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already cancelled");
    }

    @Test
    @DisplayName("Cancel appointment fails if not the patient's own appointment")
    void cancelAppointment_notOwner_shouldThrow() {
        Appointment appointment = new Appointment();
        appointment.setId(1L);
        appointment.setPatientUserId(2L);
        appointment.setStatus(AppointmentStatus.BOOKED);

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.cancelAppointment(1L, 99L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("only cancel your own");
    }

    @Test
    @DisplayName("Cancel appointment fails if already attended/completed")
    void cancelAppointment_completed_shouldThrow() {
        Appointment appointment = new Appointment();
        appointment.setId(1L);
        appointment.setPatientUserId(2L);
        appointment.setStatus(AppointmentStatus.COMPLETED);

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.cancelAppointment(1L, 2L, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be cancelled");
    }

    @Test
    @DisplayName("Book appointment fails when doctor is not active")
    void book_doctorNotActive_shouldThrow() {
        doctorProfile.setApprovalStatus(DoctorApprovalStatus.PENDING_REVIEW);
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        BookAppointmentRequest request = new BookAppointmentRequest(1L, 2L, 10L, futureTime);

        when(doctorProfileRepository.findByUserId(1L)).thenReturn(Optional.of(doctorProfile));

        assertThatThrownBy(() -> appointmentService.book(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not available for booking");
    }

    @Test
    @DisplayName("Book appointment fails when clinic is not approved")
    void book_clinicNotApproved_shouldThrow() {
        clinic.setApproved(false);
        LocalDateTime futureTime = LocalDateTime.now().plusDays(1).withHour(10).withMinute(0);
        BookAppointmentRequest request = new BookAppointmentRequest(1L, 2L, 10L, futureTime);

        when(doctorProfileRepository.findByUserId(1L)).thenReturn(Optional.of(doctorProfile));
        when(clinicRepository.findById(10L)).thenReturn(Optional.of(clinic));

        assertThatThrownBy(() -> appointmentService.book(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("waiting for admin approval");
    }

    private User createUser(Long id, String name) {
        User user = new User();
        user.setId(id);
        user.setFullName(name);
        user.setEmail(name.toLowerCase().replace(" ", "") + "@test.com");
        user.setPhoneNumber("+919876543210");
        return user;
    }
}
