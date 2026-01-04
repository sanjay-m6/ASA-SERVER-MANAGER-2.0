
# Run key generation
Write-Host "Generating keys..."
# Send two newlines for password prompt
$inputString = "`n`n"
$output = $inputString | npm run tauri signer generate 2>&1
$outputStr = $output -join "`n"

# Parse keys using regex
if ($outputStr -match "Your public key was:\s+(.+)") {
    $pubKey = $matches[1].Trim()
}
if ($outputStr -match "Your private key was:\s+(.+)") {
    $privKey = $matches[1].Trim()
}

if (-not $privKey) {
    Write-Host "Failed to generate keys. Output:"
    Write-Host $outputStr
    exit 1
}

Write-Host "Keys generated successfully."

# Update tauri.conf.json
$confPath = "src-tauri/tauri.conf.json"
$conf = Get-Content $confPath -Raw | ConvertFrom-Json
$conf.plugins.updater.pubkey = $pubKey
$conf | ConvertTo-Json -Depth 10 | Set-Content $confPath

# Set private key env var
$env:TAURI_SIGNING_PRIVATE_KEY = $privKey
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

# Build
Write-Host "Starting build..."
npm run tauri build
