[CmdletBinding()]
param(
  [string]$RunLabel = "default"
)

$ErrorActionPreference = "Stop"

$base = "http://localhost:8085/api"
$ts = Get-Date -Format "yyyyMMddHHmmss"
$summary = [ordered]@{
  runLabel = $RunLabel
  timestamp = $ts
  baseUrl = $base
}

function Post-Json($path, $body, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method Post -Headers $headers -Body ($body | ConvertTo-Json -Depth 8)
}

function Get-Json($path, $token) {
  $headers = @{}
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method Get -Headers $headers
}

function Patch-Json($path, $token) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  return Invoke-RestMethod -Uri "$base$path" -Method Patch -Headers $headers -Body "{}"
}

function Assert-True($condition, $message) {
  if (-not $condition) {
    throw "ASSERT FAILED: $message"
  }
}

function Expect-BadRequest($actionName, [scriptblock]$action) {
  try {
    & $action | Out-Null
    throw "Expected bad request for $actionName but call succeeded"
  } catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 400) {
      throw "Expected 400 for $actionName but got $statusCode"
    }
  }
}

Write-Host "[1/10] Registering users"
$admin = Post-Json "/auth/register" @{ fullName = "Admin $ts"; email = "admin.$ts@test.local"; phoneNumber = "90${ts}01"; password = "Pass@123"; role = "ADMIN"; latitude = 28.6139; longitude = 77.2090 }
$clinic1 = Post-Json "/auth/register" @{ fullName = "Clinic One $ts"; email = "clinic1.$ts@test.local"; phoneNumber = "90${ts}02"; password = "Pass@123"; role = "CLINIC"; latitude = 28.6120; longitude = 77.2100 }
$clinic2 = Post-Json "/auth/register" @{ fullName = "Clinic Two $ts"; email = "clinic2.$ts@test.local"; phoneNumber = "90${ts}03"; password = "Pass@123"; role = "CLINIC"; latitude = 28.6220; longitude = 77.2150 }
$doctor1 = Post-Json "/auth/register" @{ fullName = "Doctor One $ts"; email = "doctor1.$ts@test.local"; phoneNumber = "90${ts}04"; password = "Pass@123"; role = "DOCTOR"; latitude = 28.6140; longitude = 77.2100 }
$doctor2 = Post-Json "/auth/register" @{ fullName = "Doctor Two $ts"; email = "doctor2.$ts@test.local"; phoneNumber = "90${ts}05"; password = "Pass@123"; role = "DOCTOR"; latitude = 28.6240; longitude = 77.2180 }
$patient1 = Post-Json "/auth/register" @{ fullName = "Patient One $ts"; email = "patient1.$ts@test.local"; phoneNumber = "90${ts}06"; password = "Pass@123"; role = "PATIENT"; latitude = 28.6130; longitude = 77.2095 }
$patient2 = Post-Json "/auth/register" @{ fullName = "Patient Two $ts"; email = "patient2.$ts@test.local"; phoneNumber = "90${ts}07"; password = "Pass@123"; role = "PATIENT"; latitude = 28.6140; longitude = 77.2105 }

$summary.accounts = @{
  admin = @{ userId = $admin.userId; email = $admin.email }
  clinic1 = @{ userId = $clinic1.userId; email = $clinic1.email }
  clinic2 = @{ userId = $clinic2.userId; email = $clinic2.email }
  doctor1 = @{ userId = $doctor1.userId; email = $doctor1.email }
  doctor2 = @{ userId = $doctor2.userId; email = $doctor2.email }
  patient1 = @{ userId = $patient1.userId; email = $patient1.email }
  patient2 = @{ userId = $patient2.userId; email = $patient2.email }
}

Write-Host "[2/10] Logging in users"
$loginDoctor1 = Post-Json "/auth/login" @{ identifier = $doctor1.email; password = "Pass@123" }
$loginPatient1 = Post-Json "/auth/login" @{ identifier = $patient1.email; password = "Pass@123" }
$loginPatient2 = Post-Json "/auth/login" @{ identifier = $patient2.email; password = "Pass@123" }
$loginClinic1 = Post-Json "/auth/login" @{ identifier = $clinic1.email; password = "Pass@123" }
$loginClinic2 = Post-Json "/auth/login" @{ identifier = $clinic2.email; password = "Pass@123" }
$loginDoctor2 = Post-Json "/auth/login" @{ identifier = $doctor2.email; password = "Pass@123" }
$loginAdmin = Post-Json "/auth/login" @{ identifier = $admin.email; password = "Pass@123" }
Assert-True ($loginDoctor1.role -eq "DOCTOR") "Doctor login role mismatch"
Assert-True ($loginPatient1.role -eq "PATIENT") "Patient login role mismatch"

# Extract tokens for authenticated calls
$tokenDoctor1 = $loginDoctor1.token
$tokenPatient1 = $loginPatient1.token
$tokenPatient2 = $loginPatient2.token
$tokenClinic1 = $loginClinic1.token
$tokenClinic2 = $loginClinic2.token
$tokenDoctor2 = $loginDoctor2.token
$tokenAdmin = $loginAdmin.token

$summary.logins = @{
  doctor1 = $loginDoctor1.role
  patient1 = $loginPatient1.role
}

Write-Host "[3/10] Creating clinics"
$clinicOneEntity = Post-Json "/clinics" @{ name = "Care Hub $ts"; address = "Sector 12"; phone = "9999990001"; latitude = 28.6120; longitude = 77.2100; ownerUserId = $clinic1.userId } $tokenClinic1
$clinicTwoEntity = Post-Json "/clinics" @{ name = "Metro Health $ts"; address = "Sector 18"; phone = "9999990002"; latitude = 28.6220; longitude = 77.2150; ownerUserId = $clinic2.userId } $tokenClinic2
Assert-True ($clinicOneEntity.id -gt 0) "Clinic 1 creation failed"
Assert-True ($clinicTwoEntity.id -gt 0) "Clinic 2 creation failed"

# Approve clinics via admin
$null = Post-Json "/admin/clinics/approve?clinicId=$($clinicOneEntity.id)" @{} $tokenAdmin
$null = Post-Json "/admin/clinics/approve?clinicId=$($clinicTwoEntity.id)" @{} $tokenAdmin

$summary.clinics = @{
  clinicOneId = $clinicOneEntity.id
  clinicTwoId = $clinicTwoEntity.id
}

Write-Host "[4/10] Setting doctor profiles and degrees"
$null = Post-Json "/doctors/profile" @{ userId = $doctor1.userId; clinicId = $clinicOneEntity.id; specialization = "Cardiology"; bio = "Heart specialist"; workStart = "09:00"; workEnd = "12:00"; slotDurationMinutes = 30 } $tokenDoctor1
$null = Post-Json "/doctors/profile" @{ userId = $doctor2.userId; clinicId = $clinicTwoEntity.id; specialization = "Dermatology"; bio = "Skin specialist"; workStart = "10:00"; workEnd = "13:00"; slotDurationMinutes = 30 } $tokenDoctor2
$null = Post-Json "/doctors/$($doctor1.userId)/degrees" @{ degreeName = "MBBS"; institute = "AIIMS"; yearOfCompletion = 2015 } $tokenDoctor1
$null = Post-Json "/doctors/$($doctor1.userId)/degrees" @{ degreeName = "MD Cardiology"; institute = "PGI"; yearOfCompletion = 2019 } $tokenDoctor1
$degrees = Get-Json "/doctors/$($doctor1.userId)/degrees"
Assert-True ($degrees.Count -ge 2) "Doctor degrees not added"

$summary.doctorSetup = @{
  doctor1Degrees = $degrees.Count
}

Write-Host "[5/10] Adding ratings and validating nearby doctors"
$null = Post-Json "/doctors/$($doctor1.userId)/ratings" @{ patientUserId = $patient1.userId; score = 5; review = "Great consultation" } $tokenPatient1
$null = Post-Json "/doctors/$($doctor1.userId)/ratings" @{ patientUserId = $patient2.userId; score = 4; review = "Good explanation" } $tokenPatient2
$nearby = Get-Json "/clinics/nearby-doctors?latitude=28.6139&longitude=77.2090"
Assert-True ($nearby.Count -ge 2) "Nearby doctors should include at least 2 profiles"
$nearDoctor1 = $nearby | Where-Object { $_.doctorUserId -eq $doctor1.userId } | Select-Object -First 1
Assert-True ($null -ne $nearDoctor1) "Doctor1 not found in nearby list"
Assert-True ($nearDoctor1.clinicId -eq $clinicOneEntity.id) "ClinicId missing/mismatch in nearby response"

$summary.discovery = @{
  nearbyDoctors = $nearby.Count
  doctor1ClinicId = $nearDoctor1.clinicId
}

Write-Host "[6/10] Booking appointments"
$testDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$slots = Get-Json "/appointments/doctor/$($doctor1.userId)/slots?date=$testDate" $tokenPatient1
Assert-True ($slots.availableSlots.Count -ge 2) "Expected at least 2 available slots"

$appt1 = Post-Json "/appointments/book" @{ doctorUserId = $doctor1.userId; patientUserId = $patient1.userId; clinicId = $clinicOneEntity.id; startTime = $slots.availableSlots[0] } $tokenPatient1
$appt2 = Post-Json "/appointments/book" @{ doctorUserId = $doctor1.userId; patientUserId = $patient2.userId; clinicId = $clinicOneEntity.id; startTime = $slots.availableSlots[1] } $tokenPatient2
Assert-True ($appt1.status -eq "BOOKED") "Appointment1 not booked"
Assert-True ($appt2.status -eq "BOOKED") "Appointment2 not booked"

$summary.appointments = @{
  appointment1 = @{ id = $appt1.appointmentId; status = $appt1.status }
  appointment2 = @{ id = $appt2.appointmentId; status = $appt2.status }
}

Write-Host "[7/10] Cancelling one appointment"
$cancelled = Patch-Json "/appointments/$($appt2.appointmentId)/cancel" $tokenPatient2
Assert-True ($cancelled.status -eq "CANCELLED") "Appointment cancel failed"

$summary.cancellation = @{
  appointment2Status = $cancelled.status
}

Write-Host "[8/10] Creating visit and validating cancelled-visit block"
$visit = Post-Json "/visits" @{ appointmentId = $appt1.appointmentId; doctorUserId = $doctor1.userId; patientUserId = $patient1.userId; visitDate = $testDate; diagnosis = "Hypertension"; diseaseHistory = "BP fluctuations"; medications = "Amlodipine" } $tokenDoctor1
Assert-True ($visit.id -gt 0) "Visit creation failed"

Expect-BadRequest "visit on cancelled appointment" { Post-Json "/visits" @{ appointmentId = $appt2.appointmentId; doctorUserId = $doctor1.userId; patientUserId = $patient2.userId; visitDate = $testDate; diagnosis = "Should fail"; diseaseHistory = "Cancelled"; medications = "None" } $tokenDoctor1 }

$summary.visits = @{
  visitId = $visit.id
  cancelledVisitBlocked = $true
}

Write-Host "[9/10] Validating doctor and patient history"
$patientVisits = Get-Json "/visits/patient/$($patient1.userId)" $tokenPatient1
Assert-True ($patientVisits.Count -ge 1) "Patient visit history missing"

# Doctor-patient history requires consent; use admin token which bypasses consent check
$doctorPatientHistory = Get-Json "/visits/doctor/$($doctor1.userId)/patient/$($patient1.userId)" $tokenAdmin
Assert-True ($doctorPatientHistory.Count -ge 1) "Doctor patient history missing"

$summary.history = @{
  patient1Visits = $patientVisits.Count
  doctorToPatient1Visits = $doctorPatientHistory.Count
}

Write-Host "[10/10] Validating admin dashboard"
$dashboard = Get-Json "/admin/dashboard" $tokenAdmin
Assert-True ($dashboard.totalUsers -ge 7) "Admin dashboard user count too low"
Assert-True ($dashboard.totalClinics -ge 2) "Admin dashboard clinic count too low"
Assert-True ($dashboard.totalAppointments -ge 2) "Admin dashboard appointment count too low"
Assert-True ($dashboard.totalVisits -ge 1) "Admin dashboard visit count too low"

$summary.adminDashboard = @{
  totalUsers = $dashboard.totalUsers
  totalClinics = $dashboard.totalClinics
  totalAppointments = $dashboard.totalAppointments
  totalVisits = $dashboard.totalVisits
}

$reportDir = Join-Path $PSScriptRoot "qa-reports"
New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
$reportPath = Join-Path $reportDir ("qa-e2e-{0}-{1}.json" -f $RunLabel, $ts)
($summary | ConvertTo-Json -Depth 10) | Set-Content -Path $reportPath

Write-Host "E2E regression passed successfully." -ForegroundColor Green
Write-Host ("Created accounts with timestamp: {0}" -f $ts)
Write-Host ("Report saved: {0}" -f $reportPath)
