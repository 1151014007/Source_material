$ErrorActionPreference = 'Stop'
$atlasRoot = Split-Path -Parent $PSScriptRoot
$atlasUv = Get-Command uv -ErrorAction SilentlyContinue
if ($atlasUv) { $atlasUvPath = $atlasUv.Source } else {
    $atlasUvPath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.local\bin\uv.exe'
    if (-not (Test-Path -LiteralPath $atlasUvPath)) { throw 'Install uv first: https://docs.astral.sh/uv/getting-started/installation/' }
}
Push-Location (Join-Path $atlasRoot 'backend')
try {
    & $atlasUvPath sync --frozen
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed' }
    & '.\.venv\Scripts\python.exe' (Join-Path $atlasRoot 'scripts\bootstrap_env.py')
    if ($LASTEXITCODE -ne 0) { throw 'Configuration initialization failed' }
} finally { Pop-Location }
Push-Location $atlasRoot
try {
    docker compose up -d --wait db redis
    if ($LASTEXITCODE -ne 0) { throw 'Local database services failed' }
} finally { Pop-Location }
Push-Location (Join-Path $atlasRoot 'backend')
try {
    & '.\.venv\Scripts\alembic.exe' upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed' }
    & '.\.venv\Scripts\python.exe' -m app.bootstrap
    if ($LASTEXITCODE -ne 0) { throw 'Administrator initialization failed' }
} finally { Pop-Location }
Push-Location (Join-Path $atlasRoot 'frontend')
try {
    npm ci --cache (Join-Path $atlasRoot '.local\npm-cache') --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' }
} finally { Pop-Location }
Write-Host 'Initialized. Start API and frontend using README. Credentials remain in local .env.'
