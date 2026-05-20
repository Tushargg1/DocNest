package com.doctpjt.clinicapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.doctpjt.clinicapp.entity.Role;
import com.doctpjt.clinicapp.entity.User;
import com.doctpjt.clinicapp.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
public class ClinicAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(ClinicAppApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedData(UserRepository userRepository, PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        return args -> {
            // Keep email optional for phone-first onboarding, even on existing schemas.
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL");

            seedUser(userRepository, passwordEncoder, "patient@test.com", "Patient User", Role.PATIENT);
            seedUser(userRepository, passwordEncoder, "clinic@test.com", "Clinic Admin", Role.CLINIC);
            seedUser(userRepository, passwordEncoder, "doctor@test.com", "Doctor User", Role.DOCTOR);
            seedUser(userRepository, passwordEncoder, "admin@test.com", "Head Admin", Role.ADMIN);
        };
    }

    private void seedUser(UserRepository repo, PasswordEncoder encoder, String email, String name, Role role) {
        if (repo.findByEmail(email).isEmpty()) {
            User user = new User();
            user.setFullName(name);
            user.setEmail(email);
            user.setRole(role);
            user.setPassword(encoder.encode("password123"));
            user.setPhoneNumber("9" + (100000000 + role.ordinal()));
            repo.save(user);
        }
    }
}
