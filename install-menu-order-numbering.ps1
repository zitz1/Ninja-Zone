$ErrorActionPreference = 'Stop'

$project = 'C:\Users\Binkhalid\Downloads\ninja zone'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path $project)) {
  throw "Project not found: $project"
}

Set-Location $project

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Ninja Zone - Menu Order Number Fix' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $project ".backup-menu-order-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$schemaPath = Join-Path $project 'prisma\schema.prisma'
$ordersPagePath = Join-Path $project 'app\cashier\orders\page.tsx'
$sqlSource = Join-Path $scriptRoot 'prisma-menu-order-numbering.sql'
$pageSource = Join-Path $scriptRoot 'cashier-orders-page-public-number.tsx'
$sqlProject = Join-Path $project 'prisma\menu-order-numbering.sql'

foreach ($required in @($sqlSource, $pageSource, $schemaPath, $ordersPagePath)) {
  if (-not (Test-Path $required)) {
    throw "Required file not found: $required"
  }
}

# Backups before any change.
Copy-Item -LiteralPath $schemaPath -Destination (Join-Path $backupDir 'schema.prisma') -Force
Copy-Item -LiteralPath $ordersPagePath -Destination (Join-Path $backupDir 'orders-page.tsx') -Force

# Keep the SQL migration inside the project for traceability.
Copy-Item -LiteralPath $sqlSource -Destination $sqlProject -Force

Write-Host '[1/5] Applying additive database change...' -ForegroundColor Yellow
npx prisma db execute --file .\prisma\menu-order-numbering.sql

Write-Host '[2/5] Syncing Prisma schema from the database...' -ForegroundColor Yellow
npx prisma db pull

Write-Host '[3/5] Regenerating Prisma Client...' -ForegroundColor Yellow
npx prisma generate

Write-Host '[4/5] Installing the fixed cashier orders page...' -ForegroundColor Yellow
Copy-Item -LiteralPath $pageSource -Destination $ordersPagePath -Force

Write-Host '[5/5] Checking TypeScript...' -ForegroundColor Yellow
npx tsc --noEmit

Write-Host ''
Write-Host 'DONE.' -ForegroundColor Green
Write-Host 'Order IDs are no longer shown as database UUID fragments.' -ForegroundColor Green
Write-Host 'New public order format: #NZ-O-YYMMDD-XXXX' -ForegroundColor Green
Write-Host "Backup created at: $backupDir" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Restart the dev server if it is running:' -ForegroundColor Cyan
Write-Host 'npm run dev' -ForegroundColor White
