package com.doctpjt.clinicapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

public class PaymentDtos {

    @Data
    public static class CreateOrderRequest {
        @NotNull(message = "Appointment ID is required")
        private Long appointmentId;

        @NotNull(message = "Amount is required")
        private Double amount;
    }

    @Data
    public static class CreateOrderResponse {
        private Long paymentId;
        private String razorpayOrderId;
        private Double amount;
        private String currency;
        private String razorpayKeyId;
        private String status;
    }

    @Data
    public static class VerifyPaymentRequest {
        @NotNull(message = "Razorpay Order ID is required")
        private String razorpayOrderId;

        @NotNull(message = "Razorpay Payment ID is required")
        private String razorpayPaymentId;

        @NotNull(message = "Razorpay Signature is required")
        private String razorpaySignature;
    }

    @Data
    public static class PaymentResponse {
        private Long id;
        private Long appointmentId;
        private Long patientUserId;
        private Double amount;
        private String currency;
        private String status;
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private String createdAt;
        private String updatedAt;
    }
}
