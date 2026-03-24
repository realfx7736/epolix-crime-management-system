# Test E-POLIX User Login Flows (Deep Debug Stage 2)

$BASE_URL = "http://localhost:5000/api"

function Invoke-TestLogin {
    param($Role, $Identifier, $Password = $null)

    Write-Host "`n--- Testing $Role Login ($Identifier) ---" -ForegroundColor Cyan
    $Body = @{ role = $Role; identifier = $Identifier }
    if ($Password) { $Body.password = $Password }
    
    $json = $Body | ConvertTo-Json
    
    try {
        if ($Role -eq "citizen") {
            $Resp = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/citizen/login" -Body $json -ContentType "application/json"
        } else {
            $Resp = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/terminal/login" -Body $json -ContentType "application/json"
        }
        
        if ($Resp.success) {
            Write-Host "Stage 1 OK: $($Resp.message)" -ForegroundColor Green
            if ($Resp.otp) {
               Write-Host "Received OTP: $($Resp.otp)" -ForegroundColor Yellow
               # Stage 2: Verify OTP
               $VerifyBody = @{ userId = $Resp.userId; role = $Role; otp = $Resp.otp } | ConvertTo-Json
               try {
                   $Final = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/verify-otp" -Body $VerifyBody -ContentType "application/json"
                   if ($Final.success) {
                       Write-Host "Stage 2 OK: Login Successful for $($Final.user.fullName) [Role: $($Final.user.role)]" -ForegroundColor Green
                   } else {
                        Write-Host "Stage 2 LOGIC ERROR: Success was false" -ForegroundColor Red
                   }
               } catch {
                   $err = $_.Exception
                   Write-Host "Stage 2 FAILED: $($err.Message)" -ForegroundColor Red
                   if ($err.Response) {
                        $reader = New-Object System.IO.StreamReader($err.Response.GetResponseStream())
                        $body = $reader.ReadToEnd()
                        Write-Host "Stage 2 ERROR RAW: $body" -ForegroundColor Gray
                   }
               }
            }
        }
    } catch {
        $err = $_.Exception
        Write-Host "Stage 1 FAILED: $($err.Message)" -ForegroundColor Red
    }
}

# --- All Scenarios ---
Invoke-TestLogin -Role "citizen" -Identifier "9333333333"
Invoke-TestLogin -Role "citizen" -Identifier "rahul@example.com" -Password "password123"
Invoke-TestLogin -Role "police" -Identifier "POLICE-001" -Password "password123"
Invoke-TestLogin -Role "staff" -Identifier "7777777777"
Invoke-TestLogin -Role "staff" -Identifier "STF-001" -Password "password123"
Invoke-TestLogin -Role "admin" -Identifier "ADMIN-001" -Password "password123"
