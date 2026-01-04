
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "npm.cmd"
$psi.Arguments = "run tauri -- signer generate"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.UseShellExecute = $false

$p = [System.Diagnostics.Process]::Start($psi)

# Send Enter twice for password
$p.StandardInput.WriteLine("")
$p.StandardInput.WriteLine("")

$output = $p.StandardOutput.ReadToEnd()
$p.WaitForExit()

$output | Out-File "keys_ps.txt" -Encoding UTF8

if ($output -match "Your public key was:\s+(.+)") {
    Write-Host "PUB:$($matches[1].Trim())"
}
if ($output -match "Your private key was:\s+(.+)") {
    Write-Host "PRIV:$($matches[1].Trim())"
}
