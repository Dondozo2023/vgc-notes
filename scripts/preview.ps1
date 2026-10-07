$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $PSScriptRoot
$localHugo = Join-Path $siteRoot '.tools/hugo/hugo.exe'
$workspaceHugo = Join-Path $siteRoot '../../work/tools/hugo/hugo.exe'
if (Test-Path -LiteralPath $workspaceHugo) {
    $hugoExecutable = (Resolve-Path -LiteralPath $workspaceHugo).Path
} elseif (Test-Path -LiteralPath $localHugo) {
    $hugoExecutable = $localHugo
} elseif (Get-Command hugo -ErrorAction SilentlyContinue) {
    $hugoExecutable = (Get-Command hugo).Source
} else {
    $hugoVersion = '0.167.0'
    $hugoDirectory = Split-Path -Parent $localHugo
    New-Item -ItemType Directory -Path $hugoDirectory -Force | Out-Null
    $archiveName = "hugo_${hugoVersion}_windows-amd64.zip"
    $archivePath = Join-Path $hugoDirectory $archiveName
    $checksumPath = Join-Path $hugoDirectory 'checksums.txt'
    Invoke-WebRequest -Uri "https://github.com/gohugoio/hugo/releases/download/v${hugoVersion}/${archiveName}" -OutFile $archivePath
    Invoke-WebRequest -Uri "https://github.com/gohugoio/hugo/releases/download/v${hugoVersion}/hugo_${hugoVersion}_checksums.txt" -OutFile $checksumPath
    $checksumLine = Get-Content -LiteralPath $checksumPath | Where-Object { $_ -match [regex]::Escape($archiveName) }
    $expectedHash = ($checksumLine -split '\s+')[0]
    if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expectedHash) { throw 'Hugo checksum verification failed' }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $hugoDirectory -Force
    $hugoExecutable = $localHugo
}
& $hugoExecutable server --source $siteRoot --bind 127.0.0.1 --port 1313 --disableFastRender --noHTTPCache
