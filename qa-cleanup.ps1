[CmdletBinding()]
param(
    [string]$EmailDomain = "test.local",
    [string]$AdminEmail = "admin@test.com",
    [string]$AdminPassword = "password123"
)

$ErrorActionPreference = "Stop"
$base = "http://localhost:8085/api"

Write-Host ("Logging in as admin: {0}" -f $AdminEmail)
$loginBody = @{ identifier = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
$loginResult = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResult.token

if (-not $token) {
    throw "Failed to obtain admin token. Check admin credentials."
}

Write-Host ("Cleaning test data for email domain: {0}" -f $EmailDomain)
$headers = @{ "Authorization" = "Bearer $token" }
$result = Invoke-RestMethod -Uri "$base/admin/cleanup-test-data?emailDomain=$EmailDomain" -Method Post -ContentType "application/json" -Body "{}" -Headers $headers

Write-Host "Cleanup completed." -ForegroundColor Green
$result | ConvertTo-Json -Depth 8
