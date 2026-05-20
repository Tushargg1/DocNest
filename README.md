# DocNest - Doctor Clinic Appointment Platform

Full-stack project using React + Tailwind (frontend) and Spring Boot + MySQL (backend).

## Features Implemented

- Separate login flow for:
  - Patients
  - Doctors/Clinics
  - Head Admin
- Role-based routing on frontend.
- User registration with role selection.
- Nearby doctor discovery by latitude/longitude.
- Doctor profile with specialization, bio, and available slot settings.
- Doctor degrees and doctor ratings endpoints.
- Appointment booking with available slot generation.
- Patient visit history (diagnosis, disease history, medications).
- Doctor access to patient visit history.
- Head admin dashboard with users, clinics, appointments, and visits summary.

## Project Structure

- `frontend` -> React + Vite + Tailwind v4
- `backend` -> Spring Boot + JPA + MySQL

## Backend Setup

1. Ensure MySQL is running.
2. Update `backend/src/main/resources/application.properties`:
  - `DB_USERNAME` (defaults to `root`)
  - `DB_PASSWORD` (defaults to empty)
  - `APP_JWT_SECRET` (recommended in non-dev)
  - `SERVER_PORT` (optional, defaults to `8085`)
3. From `backend`, run:

```bash
mvn spring-boot:run
```

Backend runs at `http://localhost:8085` by default.

Example (PowerShell):

```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
$env:APP_JWT_SECRET="replace-with-strong-32-plus-char-secret"
mvn spring-boot:run
```

## VS Code Java Troubleshooting

If you see Java editor errors like "not on the classpath" while Maven build is successful:

1. Ensure JDK 17 is installed.
2. Open Command Palette and run `Java: Clean Java Language Server Workspace`.
3. Reload the window and wait for Maven project import to finish.

Workspace Java settings are included in `.vscode/settings.json`.

## Frontend Setup

From `frontend`, run:

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Important API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Clinic / Nearby Doctors

- `POST /api/clinics`
- `GET /api/clinics/nearby-doctors?latitude=..&longitude=..`

### Doctor Profile / Degrees / Ratings

- `POST /api/doctors/profile`
- `GET /api/doctors/{doctorUserId}/profile`
- `POST /api/doctors/{doctorUserId}/degrees`
- `GET /api/doctors/{doctorUserId}/degrees`
- `POST /api/doctors/{doctorUserId}/ratings`
- `GET /api/doctors/{doctorUserId}/ratings`

### Appointments

- `GET /api/appointments/doctor/{doctorUserId}/slots?date=YYYY-MM-DD`
- `POST /api/appointments/book`
- `GET /api/appointments/patient/{patientUserId}`

### Visit History

- `POST /api/visits`
- `GET /api/visits/patient/{patientUserId}`
- `GET /api/visits/doctor/{doctorUserId}/patient/{patientUserId}`

### Admin

- `GET /api/admin/dashboard`
- `POST /api/admin/cleanup-test-data?emailDomain=test.local`

## QA Automation

From project root:

```bash
powershell -ExecutionPolicy Bypass -File .\qa-e2e.ps1 -RunLabel smoke
```

Batch runs with CSV summary:

```bash
powershell -ExecutionPolicy Bypass -File .\qa-runner.ps1 -Runs 2 -Prefix retest -CleanupBefore
```

Cleanup generated test data (emails ending with `test.local`):

```bash
powershell -ExecutionPolicy Bypass -File .\qa-cleanup.ps1 -EmailDomain test.local
```

Reports are stored in `qa-reports/` as:

- `qa-e2e-<label>-<timestamp>.json`
- `qa-summary-<prefix>-<timestamp>.csv`

## Suggested Next Enhancements

- Add JWT authentication with refresh tokens.
- Add role-based method security (`@PreAuthorize`).
- Add clinic onboarding dashboard and doctor assignment flow.
- Add map integration (Google Maps / OpenStreetMap) for nearby clinics.
- Add payment gateway and appointment reminders.
- Add unit/integration tests for services and controllers.
