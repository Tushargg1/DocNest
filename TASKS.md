# Tasks

## Completed

- [x] Seed realistic clinic, doctors, and patient data on startup
- [x] Fix time slot filtering (hide past slots)
- [x] Add quick-login dev buttons on login page
- [x] Remove fake/old data on startup (cleanup seeder)
- [x] Admin dashboard: search bar (clinics, doctors, patients)
- [x] Admin dashboard: patient/doctor popup with full profile
- [x] Admin dashboard: clickable names in tables open popup
- [x] Patient profile: structured medical history (expandable cards with status tags)
- [x] Patient profile: delete confirmation with "delete" text input
- [x] Doctor workspace: show patient name/phone instead of IDs
- [x] Doctor workspace: only show today's patients in "My Patients" tab
- [x] Clinic workspace: privacy — only show own clinic's visit records
- [x] Medical history shown to doctor and admin in structured card format
- [x] Nearby clinics: compact location search (right of heading)
- [x] Nearby clinics: inline expand clinic to show doctors
- [x] Nearby clinics: like/favorite clinics (localStorage)
- [x] Nearby clinics: favorites filter button
- [x] Reviews gated: only after attended + visit record + prescription uploaded
- [x] Doctor details page: show patient reviews with stars
- [x] Full UI overhaul: flat white design, no gradients, no glassmorphism
- [x] Remove all emojis from UI
- [x] Professional README with badges and architecture
- [x] Vercel deployment config (vercel.json)
- [x] Bug fixes: LoginPatient/LoginDoctorClinic form field name (email → identifier)
- [x] Bug fixes: DoctorWorkspace "My Patients" uses schedule data not upcomingAppointments

## Pending

- [ ] Add notification system (appointment reminders, revisit alerts)
- [ ] Add patient appointment rescheduling
- [ ] Add doctor availability calendar (week view)
- [ ] Add clinic analytics dashboard (graphs: visits/month, revenue)
- [ ] Add prescription PDF generation improvements (clinic logo, formatting)
- [ ] Add multi-language support (Hindi/English toggle)
- [ ] Add dark mode toggle (CSS variables already defined)
- [ ] Add patient consent flow before doctor accesses medical history
- [ ] Add real file upload for prescriptions (cloud storage instead of base64)
- [ ] Add email/SMS notifications for appointment confirmations
- [ ] Add doctor search by name across all clinics
- [ ] Add payment integration (Razorpay/Stripe)
- [ ] Add unit and integration tests (JUnit for backend, Vitest for frontend)
- [ ] Deploy backend to Railway/Render with hosted MySQL
