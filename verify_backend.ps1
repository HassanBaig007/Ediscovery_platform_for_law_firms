$partnerUrl = "http://localhost:5000/api/auth/login"
$caseUrl = "http://localhost:5000/api/cases"

# 1. Login Partner
Write-Host "Logging in Partner..."
$partnerBody = @{
    email = "partner@example.com"
    password = "password"
} | ConvertTo-Json

try {
    $partnerResp = Invoke-RestMethod -Uri $partnerUrl -Method Post -ContentType "application/json" -Body $partnerBody
    $token = $partnerResp.data.accessToken
    Write-Host "Success: Got Token"
} catch {
    Write-Error "Login Failed: $_"
    exit 1
}

# 2. Create Case
Write-Host "Creating Case..."
$headers = @{
    Authorization = "Bearer $token"
}

$caseBody = @{
    caseNumber = "C001-TEST"
    caseName = "Test Case API"
    clientName = "API Client"
    opposingParty = "API Opposing"
    description = "Created via PowerShell"
} | ConvertTo-Json

try {
    $caseResp = Invoke-RestMethod -Uri $caseUrl -Method Post -ContentType "application/json" -Headers $headers -Body $caseBody
    Write-Host "Success: Case Created - $($caseResp.caseName)"
    $caseId = $caseResp.id
} catch {
    Write-Error "Create Case Failed: $_"
    exit 1
}

# 3. Get Cases
Write-Host "Fetching Cases..."
try {
    $casesResp = Invoke-RestMethod -Uri $caseUrl -Method Get -Headers $headers
    Write-Host "Success: Fetched $($casesResp.cases.Count) cases"
} catch {
    Write-Error "Get Cases Failed: $_"
    exit 1
}

# 4. Cleanup (Delete Case)
Write-Host "Deleting Case..."
try {
    Invoke-RestMethod -Uri "$caseUrl/$caseId" -Method Delete -Headers $headers
    Write-Host "Success: Case Archived"
} catch {
    Write-Error "Delete Case Failed: $_"
    exit 1
}

Write-Host "Backend Verification Complete!"
