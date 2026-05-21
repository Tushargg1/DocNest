$base = "https://docnest-3-v5sy.onrender.com/api"
$results = @()

function Test($name, [scriptblock]$action) {
    try {
        $r = & $action
        $script:results += [pscustomobject]@{ Test=$name; Status="PASS"; Detail=$r }
        Write-Host "  PASS: $name"
    } catch {
        $script:results += [pscustomobject]@{ Test=$name; Status="FAIL"; Detail=$_.Exception.Message }
        Write-Host "  FAIL: $name - $($_.Exception.Message)"
    }
}

Write-Host "`n=== DocNest Production QA Report ==="
Write-Host "Target: $base"
Write-Host "Date: $(Get-Date)`n"

# Auth
Write-Host "--- AUTHENTICATION ---"
$pat = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"identifier":"patient@test.com","password":"password123"}'
$patH = @{ "Authorization" = "Bearer $($pat.token)"; "Content-Type" = "application/json" }
Write-Host "  PASS: Patient login (id=$($pat.userId))"

$adm = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"identifier":"admin@test.com","password":"password123"}'
$admH = @{ "Authorization" = "Bearer $($adm.token)"; "Content-Type" = "application/json" }
Write-Host "  PASS: Admin login (id=$($adm.userId))"

# Security
Write-Host "`n--- SECURITY ---"
Test "No-auth blocked" { Invoke-RestMethod -Uri "$base/admin/dashboard" -Method Get -ErrorAction Stop; throw "Should fail" }
Test "Patient cant access admin" { Invoke-RestMethod -Uri "$base/admin/dashboard" -Method Get -Headers $patH -ErrorAction Stop; throw "Should fail" }
Test "SQL injection blocked" { Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"identifier":"x'' OR 1=1","password":"x"}' -ErrorAction Stop; throw "Should fail" }
Test "Forged JWT rejected" { $fH = @{"Authorization"="Bearer fake.token.here"}; Invoke-RestMethod -Uri "$base/users/1" -Method Get -Headers $fH -ErrorAction Stop; throw "Should fail" }
Test "Wrong password rejected" { Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"identifier":"patient@test.com","password":"wrongpass"}' -ErrorAction Stop; throw "Should fail" }

# Public endpoints
Write-Host "`n--- PUBLIC ENDPOINTS ---"
Test "Nearby doctors" { $r = Invoke-RestMethod -Uri "$base/clinics/nearby-doctors?latitude=28.6&longitude=77.2" -Method Get; "Found $($r.Count) doctors" }
Test "Doctor slots" { $r = Invoke-RestMethod -Uri "$base/appointments/doctor/$($pat.userId)/slots?date=2026-05-25" -Method Get; "Slots endpoint works" }

# Features
Write-Host "`n--- FEATURES ---"
Test "Patient profile" { $r = Invoke-RestMethod -Uri "$base/patients/profile/$($pat.userId)" -Method Get -Headers $patH; "age=$($r.age)" }
Test "Symptom checker" { $r = Invoke-RestMethod -Uri "$base/symptoms/check" -Method Post -Headers $patH -Body '{"symptoms":"headache and fever"}'; "source=$($r.source)" }
Test "Admin dashboard" { $r = Invoke-RestMethod -Uri "$base/admin/dashboard" -Method Get -Headers $admH; "users=$($r.totalUsers), clinics=$($r.totalClinics)" }
Test "Favorites" { $r = Invoke-RestMethod -Uri "$base/favorites" -Method Get -Headers $patH; "count=$($r.Count)" }

Write-Host "`n--- SUMMARY ---"
$pass = ($results | Where-Object Status -eq "PASS").Count
$fail = ($results | Where-Object Status -eq "FAIL").Count
Write-Host "  Total: $($results.Count) | Pass: $pass | Fail: $fail"
if ($fail -gt 0) { Write-Host "  FAILED TESTS:"; $results | Where-Object Status -eq "FAIL" | ForEach-Object { Write-Host "    - $($_.Test): $($_.Detail)" } }
