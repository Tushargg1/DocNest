# DocNest

> A full-stack healthcare appointment platform connecting patients, doctors, and clinics with privacy-first medical record management.

![Java](https://img.shields.io/badge/Java-17-blue?logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-green?logo=springboot)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4?logo=tailwindcss&logoColor=white)

---

## Overview

DocNest is a multi-role clinic management system where:

- **Patients** discover nearby doctors, book appointment slots, manage their medical passport, and track visit history.
- **Doctors** view daily schedules, access patient medical history during appointments (privacy-gated), and write prescriptions.
- **Clinics** manage their medical staff, view appointment flow, and maintain clinic-scoped patient records.
- **Admins** oversee all clinics, approve registrations, and search across the entire system.

---

## Architecture

```
┌──────────────────┐        ┌──────────────────────┐        ┌────────────┐
│   React + Vite   │  HTTP  │   Spring Boot API    │  JPA   │   MySQL    │
│   (Port 5173)    │◄──────►│   (Port 8085)        │◄──────►│   8.0      │
│   Tailwind CSS   │        │   JWT Auth           │        │            │
└──────────────────┘        │   Role-based Access  │        └────────────┘
                            └──────────────────────┘
```

---

## Features

### Patient
- Nearby doctor discovery (geo-based)
- Slot booking with real-time availability
- Structured medical history (expandable disease cards with status tracking)
- Allergies, medications, vitals management
- Visit history and prescription records

### Doctor
- Daily schedule view with patient names
- Same-day patient medical history access (privacy-enforced)
- Prescription writing with revisit scheduling
- Leave management with auto-cancellation
- QR-based patient check-in

### Clinic
- Doctor registration and approval workflow
- Patient records scoped to own clinic only
- Appointment tracking across all staff
- Clinical notes per patient

### Admin
- Global search (clinics, doctors, patients)
- Clinic approval workflow
- Full patient/doctor profile popups
- Visit records and audit trail

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Java 17, Spring Boot 3.4, Spring Security, Spring Data JPA |
| Database | MySQL 8.0 |
| Auth | JWT (stateless, role-based) |
| AI | Groq API (medical intake summarization) |
| Build | Maven (backend), npm (frontend) |

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- MySQL 8.0 running locally

### Backend

```bash
cd backend

# Set environment variables (or use defaults for dev)
export DB_USERNAME=root
export DB_PASSWORD=yourpassword
export GROQ_API_KEY=your-groq-api-key

mvn spring-boot:run
```

Server starts at `http://localhost:8085`. On first run, it seeds test accounts automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App starts at `http://localhost:5173`.

### Test Accounts

All use password: `password123`

| Role | Phone | Email |
|------|-------|-------|
| Patient | 9100000001 | patient@test.com |
| Doctor (Cardiology) | 9100000010 | priya.sharma@careplus.in |
| Doctor (Dermatology) | 9100000011 | arjun.mehta@careplus.in |
| Clinic Admin | 9100000003 | clinic@careplus.in |
| System Admin | 9100000000 | admin@test.com |

---

## Project Structure

```
DocNest/
├── backend/
│   ├── src/main/java/com/doctpjt/clinicapp/
│   │   ├── config/          # Security, exception handling
│   │   ├── controller/      # REST endpoints
│   │   ├── dto/             # Request/response records
│   │   ├── entity/          # JPA entities
│   │   ├── repository/      # Data access
│   │   ├── service/         # Business logic
│   │   └── audit/           # Access logging
│   └── src/main/resources/
│       └── application.properties
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Route pages
│   │   └── services/        # API client
│   └── package.json
├── vercel.json              # Deployment config
└── README.md
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (phone or email) |

### Clinics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clinics/nearby-doctors` | Geo-based doctor search |
| GET | `/api/clinics/doctor/{id}` | Doctor detail card |
| GET | `/api/clinics/{id}/dashboard` | Clinic dashboard (auth) |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments/doctor/{id}/slots` | Available slots for date |
| POST | `/api/appointments/book` | Book a slot |
| POST | `/api/appointments/check-in` | QR check-in |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/visits` | Create visit record (Rx) |
| GET | `/api/visits/patient/{id}` | Patient visit history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | System overview |
| POST | `/api/admin/clinics/approve` | Approve clinic |

---

## Privacy Model

- **Doctors** can only view patient medical history during same-day active appointments. Previous days' data is not accessible.
- **Clinics** can only see visit records from their own clinic. Patient's personal medical history and visits to other clinics remain hidden.
- **Patients** have full control over their medical passport. Data sharing requires active appointment context.
- **Admin** has read access to all records for oversight purposes.

---

## Deployment

Frontend is configured for Vercel deployment via `vercel.json`. Backend requires a hosted MySQL instance and can be deployed to any Java-compatible platform (Railway, Render, AWS).

---

## License

This project is for educational and demonstration purposes.
