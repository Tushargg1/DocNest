package com.doctpjt.clinicapp.repository;

import com.doctpjt.clinicapp.entity.Payment;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByAppointmentId(Long appointmentId);

    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
}
