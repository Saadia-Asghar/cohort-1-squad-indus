# Start Sweet Tooth local preview (PowerShell)
# Usage: .\scripts\start-preview.ps1 -DbPassword "your-supabase-db-password"

param(
  [Parameter(Mandatory = $true)]
  [string]$DbPassword
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# Load .env if present (DATABASE_URL, WHATSAPP_*)
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (-not [string]::IsNullOrEmpty($name)) { Set-Item -Path "env:$name" -Value $value }
    }
  }
  Write-Host "Loaded .env"
}

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://postgres.gdmciybkdiuomowvpjyn:$DbPassword@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
}
$env:NODE_ENV = "development"
$env:PORT = "8080"
$env:BASE_PATH = "/"

Write-Host "Starting API on http://localhost:8080 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\artifacts\api-server'; `$env:DATABASE_URL='$env:DATABASE_URL'; `$env:PORT='8080'; npx --yes tsx@4.19.4 ./src/index.ts"
)

Start-Sleep -Seconds 3

Write-Host "Starting frontend on http://localhost:20458 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root\artifacts\sweet-tooth'; `$env:PORT='20458'; `$env:BASE_PATH='/'; npx --yes pnpm@10 run dev"
)

Write-Host ""
Write-Host "Preview URLs:"
Write-Host "  Marketplace:  http://localhost:20458/"
Write-Host "  Baker Portal: http://localhost:20458/dashboard"
Write-Host "  Agent Hub:    http://localhost:20458/dashboard/agent-hub"
Write-Host "  Analytics:    http://localhost:20458/dashboard/analytics"
Write-Host "  API health:   http://localhost:8080/api/healthz"
