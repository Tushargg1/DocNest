package com.doctpjt.clinicapp.controller;

import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderRequest;
import com.doctpjt.clinicapp.dto.PaymentDtos.CreateOrderResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.PaymentResponse;
import com.doctpjt.clinicapp.dto.PaymentDtos.VerifyPaymentRequest;
import com.doctpjt.clinicapp.service.PaymentService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * GET /api/payments/status — Check if payment is enabled
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> getPaymentStatus() {
        return ResponseEntity.ok(Map.of("enabled", paymentService.isPaymentEnabled()));
    }

    /**
     * POST /api/payments/create-order — Creates a payment order
     */
    @PostMapping("/create-order")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public ResponseEntity<CreateOrderResponse> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            Authentication authentication) {
        Long patientUserId = (Long) authentication.getPrincipal();
        CreateOrderResponse response = paymentService.createOrder(request, patientUserId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/payments/verify — Verifies payment after Razorpay callback
     */
    @PostMapping("/verify")
    @PreAuthorize("hasAnyRole('PATIENT', 'ADMIN')")
    public ResponseEntity<PaymentResponse> verifyPayment(
            @Valid @RequestBody VerifyPaymentRequest request) {
        PaymentResponse response = paymentService.verifyPayment(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/payments/appointment/{appointmentId} — Get payment status for an appointment
     */
    @GetMapping("/appointment/{appointmentId}")
    @PreAuthorize("hasAnyRole('PATIENT', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<PaymentResponse> getPaymentForAppointment(
            @PathVariable Long appointmentId) {
        PaymentResponse response = paymentService.getPaymentByAppointmentId(appointmentId);
        if (response == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/payments/{id}/refund — Initiate refund (admin only)
     */
    @PostMapping("/{id}/refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentResponse> processRefund(@PathVariable Long id) {
        PaymentResponse response = paymentService.processRefund(id);
        return ResponseEntity.ok(response);
    }
}
