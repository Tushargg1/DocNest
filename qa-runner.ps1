[CmdletBinding()]
param(
    [int]$Runs = 2,
    [string]$Prefix = "batch",
    [switch]$CleanupBefore,
    [string]$EmailDomain = "test.local"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$reportDir = Join-Path $root "qa-reports"
New-Item -Path $reportDir -ItemType Directory -Force | Out-Null

if ($CleanupBefore) {
    Write-Host "Running cleanup before batch..."
    powershell -ExecutionPolicy Bypass -File (Join-Path $root "qa-cleanup.ps1") -EmailDomain $EmailDomain
}

$runStamp = Get-Date -Format "yyyyMMddHHmmss"
$summaryRows = @()

for ($i = 1; $i -le $Runs; $i++) {
    $label = "{0}{1:00}" -f $Prefix, $i
    Write-Host ("Starting run {0}/{1} with label {2}" -f $i, $Runs, $label)

    powershell -ExecutionPolicy Bypass -File (Join-Path $root "qa-e2e.ps1") -RunLabel $label

    $report = Get-ChildItem $reportDir -Filter ("qa-e2e-{0}-*.json" -f $label) |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $report) {
        throw "No report found for label $label"
    }

    $json = Get-Content $report.FullName -Raw | ConvertFrom-Json
    $summaryRows += [pscustomobject]@{
        runLabel = $json.runLabel
        timestamp = $json.timestamp
        users = $json.adminDashboard.totalUsers
        clinics = $json.adminDashboard.totalClinics
        appointments = $json.adminDashboard.totalAppointments
        visits = $json.adminDashboard.totalVisits
        nearbyDoctors = $json.discovery.nearbyDoctors
        patient1Visits = $json.history.patient1Visits
        reportFile = $report.Name
    }
}

$csvPath = Join-Path $reportDir ("qa-summary-{0}-{1}.csv" -f $Prefix, $runStamp)
$summaryRows | Export-Csv -Path $csvPath -NoTypeInformation

Write-Host "Batch runs completed." -ForegroundColor Green
Write-Host ("CSV summary: {0}" -f $csvPath)
$summaryRows | Format-Table -AutoSize
