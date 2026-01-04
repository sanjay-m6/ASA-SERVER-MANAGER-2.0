
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c npm run tauri -- signer generate"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false
$psi.WorkingDirectory = Get-Location

$p = [System.Diagnostics.Process]::Start($psi)

# Send Enter twice for password (wait a bit to be safe)
Start-Sleep -Seconds 1
$p.StandardInput.WriteLine("")
Start-Sleep -Seconds 1
$p.StandardInput.WriteLine("")

$output = $p.StandardOutput.ReadToEnd()
$p.WaitForExit()

$output | Out-File "keys_ps_2.txt" -Encoding UTF8

if ($output -match "Your public key was:\s+(.+)") {
    Write-Host "PUB:$($matches[1].Trim())"
}
else {
    Write-Host "PUB_NOT_FOUND"
}
