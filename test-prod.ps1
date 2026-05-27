$base = "https://docnest-3-v5sy.onrender.com/api"
$ErrorActionPreference = "Continue"

Write-Host "=== DocNest Production Test ==="
Write-Host ""

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body '{"identifier":"patient@test.com","password":"password123"}' -TimeoutSec 90
Write-Host "Login: OK (id=$($login.userId))"
$h = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }

Write-Host ""
Write-Host "Symptom Checker..."
try {
    $sym = Invoke-RestMethod -Uri "$base/symptoms/check" -Method Post -Headers $h -Body '{"symptoms":"headache and fever"}' -TimeoutSec 60
    Write-Host "  Source: $($sym.source)"
    Write-Host "  Analysis length: $($sym.analysis.Length) chars"
} catch { Write-Host "  FAIL: $_" }

Write-Host ""
Write-Host "Intake (RAG)..."
try {
    $intake = Invoke-RestMethod -Uri "$base/intake/start" -Method Post -Headers $h -TimeoutSec 60
    Write-Host "  Status: $($intake.status)"
    Write-Host "  Question: $($intake.question)"
    if ($intake.ragInfo) {
        Write-Host "  RAG Info: $($intake.ragInfo.message)"
        Write-Host "  Known conditions: $($intake.ragInfo.knownConditions -join ', ')"
        Write-Host "  Pre-filled: $($intake.ragInfo.preFilledFields -join ', ')"
    } else {
        Write-Host "  RAG: No previous data found (new patient)"
    }
} catch { Write-Host "  FAIL: $_" }

Write-Host ""
Write-Host "Favorites..."
try {
    $fav = Invoke-RestMethod -Uri "$base/favorites" -Method Get -Headers $h -TimeoutSec 30
    Write-Host "  Count: $($fav.Count)"
} catch { Write-Host "  FAIL: $_" }

Write-Host ""
Write-Host "=== DONE ==="
