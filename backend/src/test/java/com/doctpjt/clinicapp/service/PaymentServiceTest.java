package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderRequest;
import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.PaymentResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.VerifyPaymentRequest;
import com.doctpjt.clinicapp.entity.Payment;
import com.doctpjt.clinicapp.entity.PaymentStatus;
import com.doctpjt.clinicapp.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", "rzp_test_key");
        ReflectionTestUtils.setField(paymentService, "razorpayKeySecret", "test_secret");
        ReflectionTestUtils.setField(paymentService, "paymentEnabled", true);
    }

    @Test
    @DisplayName("Create order succeeds when payment is enabled")
    void createOrder_shouldReturnOrderResponse() {
        CreateOrderRequest request = new CreateOrderRequest();
        request.setAppointmentId(1L);
        request.setAmount(500.0);

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment saved = invocation.getArgument(0);
            saved.setId(100L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });

        CreateOrderResponse response = paymentService.createOrder(request, 2L);

        assertThat(response).isNotNull();
        assertThat(response.getPaymentId()).isEqualTo(100L);
        assertThat(response.getAmount()).isEqualTo(500.0);
        assertThat(response.getCurrency()).isEqualTo("INR");
        assertThat(response.getRazorpayKeyId()).isEqualTo("rzp_test_key");
        assertThat(response.getRazorpayOrderId()).startsWith("order_");
        assertThat(response.getStatus()).isEqualTo("PENDING");

        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("Create order fails when payment is disabled")
    void createOrder_paymentDisabled_shouldThrow() {
        ReflectionTestUtils.setField(paymentService, "paymentEnabled", false);

        CreateOrderRequest request = new CreateOrderRequest();
        request.setAppointmentId(1L);
        request.setAmount(500.0);

        assertThatThrownBy(() -> paymentService.createOrder(request, 2L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Payment is disabled");

        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Verify payment marks payment as completed")
    void verifyPayment_shouldMarkCompleted() {
        Payment existingPayment = createPayment(1L, PaymentStatus.PENDING);
        existingPayment.setRazorpayOrderId("order_abc123");

        VerifyPaymentRequest request = new VerifyPaymentRequest();
        request.setRazorpayOrderId("order_abc123");
        request.setRazorpayPaymentId("pay_xyz789");
        request.setRazorpaySignature("signature_123");

        when(paymentRepository.findByRazorpayOrderId("order_abc123")).thenReturn(Optional.of(existingPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.verifyPayment(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        assertThat(response.getRazorpayPaymentId()).isEqualTo("pay_xyz789");
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("Verify payment fails if order not found")
    void verifyPayment_orderNotFound_shouldThrow() {
        VerifyPaymentRequest request = new VerifyPaymentRequest();
        request.setRazorpayOrderId("order_nonexistent");
        request.setRazorpayPaymentId("pay_xyz");
        request.setRazorpaySignature("sig");

        when(paymentRepository.findByRazorpayOrderId("order_nonexistent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.verifyPayment(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Payment not found");
    }

    @Test
    @DisplayName("Process refund marks payment as refunded")
    void processRefund_shouldMarkRefunded() {
        Payment completedPayment = createPayment(1L, PaymentStatus.COMPLETED);
        completedPayment.setRazorpayPaymentId("pay_abc");

        when(paymentRepository.findById(1L)).thenReturn(Optional.of(completedPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponse response = paymentService.processRefund(1L);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("REFUNDED");
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("Process refund fails if payment not completed")
    void processRefund_notCompleted_shouldThrow() {
        Payment pendingPayment = createPayment(1L, PaymentStatus.PENDING);

        when(paymentRepository.findById(1L)).thenReturn(Optional.of(pendingPayment));

        assertThatThrownBy(() -> paymentService.processRefund(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot refund a payment that is not completed");

        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Process refund fails if payment not found")
    void processRefund_notFound_shouldThrow() {
        when(paymentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.processRefund(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Payment not found");
    }

    private Payment createPayment(Long id, PaymentStatus status) {
        Payment payment = new Payment();
        payment.setId(id);
        payment.setAppointmentId(1L);
        payment.setPatientUserId(2L);
        payment.setAmount(500.0);
        payment.setCurrency("INR");
        payment.setStatus(status);
        payment.setRazorpayOrderId("order_test123");
        payment.setCreatedAt(LocalDateTime.now());
        payment.setUpdatedAt(LocalDateTime.now());
        return payment;
    }
}
