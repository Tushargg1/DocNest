package com.doctpjt.clinicapp.service;

import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderRequest;
import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.PaymentResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.VerifyPaymentRequest;
import com.doctpjt.clinicapp.entity.Payment;
import com.doctpjt.clinicapp.entity.PaymentStatus;
import com.doctpjt.clinicapp.repository.PaymentRepository;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;

    @Value("${app.razorpay.key-id:rzp_test_stub}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret:stub_secret}")
    private String razorpayKeySecret;

    @Value("${app.payment.enabled:false}")
    private boolean paymentEnabled;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public boolean isPaymentEnabled() {
        return paymentEnabled;
    }

    /**
     * Creates a Razorpay order (stub implementation for dev).
     * In production, this would call the Razorpay Orders API.
     */
    public CreateOrderResponse createOrder(CreateOrderRequest request, Long patientUserId) {
        if (!paymentEnabled) {
            throw new IllegalStateException("Payment is disabled. Booking can proceed without payment.");
        }

        // Generate a stub Razorpay order ID (simulates Razorpay API call)
        String stubOrderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        log.info("[STUB] Creating Razorpay order: orderId={}, amount={}, appointmentId={}, patientUserId={}",
                stubOrderId, request.getAmount(), request.getAppointmentId(), patientUserId);

        // Persist payment record
        Payment payment = new Payment();
        payment.setAppointmentId(request.getAppointmentId());
        payment.setPatientUserId(patientUserId);
        payment.setAmount(request.getAmount());
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.PENDING);
        payment.setRazorpayOrderId(stubOrderId);
        payment = paymentRepository.save(payment);

        // Build response
        CreateOrderResponse response = new CreateOrderResponse();
        response.setPaymentId(payment.getId());
        response.setRazorpayOrderId(stubOrderId);
        response.setAmount(request.getAmount());
        response.setCurrency("INR");
        response.setRazorpayKeyId(razorpayKeyId);
        response.setStatus("PENDING");

        return response;
    }

    /**
     * Verifies the Razorpay payment signature (stub implementation for dev).
     * In production, this would verify HMAC SHA256 signature using key secret.
     */
    public PaymentResponse verifyPayment(VerifyPaymentRequest request) {
        Payment payment = paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for order: " + request.getRazorpayOrderId()));

        // Stub verification: In production, verify HMAC signature
        // String generatedSignature = HmacUtils.hmacSha256Hex(razorpayKeySecret, orderId + "|" + paymentId);
        // if (!generatedSignature.equals(request.getRazorpaySignature())) throw ...

        log.info("[STUB] Verifying payment: orderId={}, paymentId={}, signature={}",
                request.getRazorpayOrderId(), request.getRazorpayPaymentId(), request.getRazorpaySignature());

        // Mark payment as completed
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setRazorpaySignature(request.getRazorpaySignature());
        payment.setStatus(PaymentStatus.COMPLETED);
        payment = paymentRepository.save(payment);

        return toResponse(payment);
    }

    /**
     * Get payment status for an appointment.
     */
    public PaymentResponse getPaymentByAppointmentId(Long appointmentId) {
        Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                .orElse(null);
        if (payment == null) return null;
        return toResponse(payment);
    }

    /**
     * Process refund (stub implementation for dev).
     * In production, this would call the Razorpay Refund API.
     */
    public PaymentResponse processRefund(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new IllegalStateException("Cannot refund a payment that is not completed. Current status: " + payment.getStatus());
        }

        log.info("[STUB] Processing refund: paymentId={}, razorpayPaymentId={}, amount={}",
                paymentId, payment.getRazorpayPaymentId(), payment.getAmount());

        payment.setStatus(PaymentStatus.REFUNDED);
        payment = paymentRepository.save(payment);

        return toResponse(payment);
    }

    private PaymentResponse toResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse();
        response.setId(payment.getId());
        response.setAppointmentId(payment.getAppointmentId());
        response.setPatientUserId(payment.getPatientUserId());
        response.setAmount(payment.getAmount());
        response.setCurrency(payment.getCurrency());
        response.setStatus(payment.getStatus().name());
        response.setRazorpayOrderId(payment.getRazorpayOrderId());
        response.setRazorpayPaymentId(payment.getRazorpayPaymentId());
        response.setCreatedAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null);
        response.setUpdatedAt(payment.getUpdatedAt() != null ? payment.getUpdatedAt().toString() : null);
        return response;
    }
}
