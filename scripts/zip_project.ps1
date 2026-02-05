$sourceDir = "c:\Users\schmiedc\Desktop\bridgeviews-main\bridgeviews-main"
$destZip = "c:\Users\schmiedc\Desktop\bridgeviews_complete.zip"
$exclude = @("node_modules", ".next", ".git", ".vscode", "tmp")

Write-Host "Preparing to zip..."
if (Test-Path $destZip) { Remove-Item $destZip }

# Create a temporary directory for staging
$stagingDir = Join-Path $env:TEMP "bridgeviews_staging_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Write-Host "Copying files to staging area (skipping heavy folders)..."
# Robocopy is robust for excluding folders
# /XD excludes directories
$excludeParams = $exclude | ForEach-Object { $_ }
robocopy $sourceDir $stagingDir /E /XD $excludeParams /XF *.log *.lock | Out-Null

# Check if robocopy failed (exit code > 8 is a failure)
if ($LASTEXITCODE -gt 8) {
    Write-Error "Robocopy failed with exit code $LASTEXITCODE"
    exit 1
}

Write-Host "Compressing..."
Compress-Archive -Path "$stagingDir\*" -DestinationPath $destZip -Force

Write-Host "Cleaning up staging..."
Remove-Item -Recurse -Force $stagingDir

Write-Host "Success! Package created at: $destZip"
