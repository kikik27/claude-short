$ErrorActionPreference = "Stop"
Write-Host "=== Step 1: Mulai Render Remotion dengan Akselerasi GPU (AiBelanjaShort 1080x1920) ==="
Set-Location -Path "$PSScriptRoot\remotion"
npx remotion render AiBelanjaShort ai-belanja-silent.mp4 --concurrency=4 --gl=angle --browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe" --timeout=120000
if ($LASTEXITCODE -ne 0) {
    Write-Error "Remotion render gagal dengan exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "=== Step 2: Merge Video dengan Full Master Mix (audio/mix.wav) ==="
Set-Location -Path "$PSScriptRoot"
ffmpeg -y -i "remotion/ai-belanja-silent.mp4" -i "audio/mix.wav" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest "out/ai-belanja-final.mp4"
if ($LASTEXITCODE -ne 0) {
    Write-Error "FFmpeg mux gagal dengan exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Copy-Item "out/ai-belanja-final.mp4" -Destination "ai-belanja-final.mp4" -Force
Write-Host "=== Render & Merge Berhasil! ==="
Get-Item "out/ai-belanja-final.mp4" | Select-Object Name, Length, LastWriteTime
