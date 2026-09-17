$ErrorActionPreference = 'Stop'

$project = 'C:\Users\Binkhalid\Downloads\ninja zone'
Set-Location $project

Write-Host 'Ninja Zone V1 finalization starting...' -ForegroundColor Cyan

# The previous script failed when the package was extracted directly into the project,
# because source and destination became the exact same files. Detect both layouts.
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packRoot = Join-Path $scriptRoot 'ninja-zone-finalization-pack'
if (-not (Test-Path (Join-Path $packRoot 'app'))) {
  $packRoot = $scriptRoot
}

function Copy-IfDifferent([string]$source, [string]$destination) {
  $src = [IO.Path]::GetFullPath($source)
  $dst = [IO.Path]::GetFullPath($destination)
  if ($src -eq $dst) {
    Write-Host "Already in project: $destination" -ForegroundColor DarkGray
    return
  }
  if (-not (Test-Path $src)) {
    throw "Missing package file: $src"
  }
  $parent = Split-Path -Parent $dst
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item -LiteralPath $src -Destination $dst -Force
}

Copy-IfDifferent (Join-Path $packRoot 'app\cashier\bookings\page.tsx') (Join-Path $project 'app\cashier\bookings\page.tsx')
Copy-IfDifferent (Join-Path $packRoot 'app\cashier\bookings\cashier-bookings.module.css') (Join-Path $project 'app\cashier\bookings\cashier-bookings.module.css')
Copy-IfDifferent (Join-Path $packRoot 'app\api\cashier\payments\route.ts') (Join-Path $project 'app\api\cashier\payments\route.ts')
Copy-IfDifferent (Join-Path $packRoot 'app\api\cashier\bookings\route.ts') (Join-Path $project 'app\api\cashier\bookings\route.ts')
Copy-IfDifferent (Join-Path $packRoot 'prisma\numbering-migration.sql') (Join-Path $project 'prisma\numbering-migration.sql')

# Add stable public numbers to Booking and Payment without deleting existing data.
$schemaPath = Join-Path $project 'prisma\schema.prisma'
$schema = Get-Content -LiteralPath $schemaPath -Raw

if ($schema -notmatch '(?ms)model Booking \{.*?\r?\n\s*bookingNumber\s+String\s+@unique') {
  $bookingPattern = '(?m)(^model Booking \{\r?\n\s*id\s+String\s+@id[^\r\n]*\r?\n)'
  $bookingInsert = '$1  bookingNumber                    String        @unique' + [Environment]::NewLine
  $schema = [regex]::Replace($schema, $bookingPattern, $bookingInsert, 1)
}

if ($schema -notmatch '(?ms)model Payment \{.*?\r?\n\s*paymentNumber\s+String\s+@unique') {
  $paymentPattern = '(?m)(^model Payment \{\r?\n\s*id\s+String\s+@id[^\r\n]*\r?\n)'
  $paymentInsert = '$1  paymentNumber                    String        @unique' + [Environment]::NewLine
  $schema = [regex]::Replace($schema, $paymentPattern, $paymentInsert, 1)
}

Set-Content -LiteralPath $schemaPath -Value $schema -Encoding UTF8

# Make booking creation generate a stable public booking number.
$enginePath = Join-Path $project 'lib\booking-engine.ts'
$engine = Get-Content -LiteralPath $enginePath -Raw

if ($engine -notmatch 'bookingNumber') {
  $needle = '          return tx.booking.create({'
  $insert = @'
          const bookingSequence = await tx.$queryRaw<Array<{ value: bigint }>>`
            SELECT nextval('ninja_zone_booking_number_seq') AS value
          `;

          const bookingDateKey = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Baghdad",
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
          })
            .format(normalized[0].startAt)
            .replaceAll("-", "");

          const bookingNumber =
            `NZ-B-${bookingDateKey}-${String(bookingSequence[0].value).padStart(4, "0")}`;

'@
  if (-not $engine.Contains($needle)) {
    throw 'Could not find booking creation point in lib/booking-engine.ts.'
  }
  $engine = $engine.Replace($needle, $insert + $needle)
}

if ($engine -notmatch 'data:\s*\{[\s\S]*?bookingNumber') {
  $engine = [regex]::Replace(
    $engine,
    '(?s)(data:\s*\{\s*\r?\n\s*userId,)\s*',
    '$1' + [Environment]::NewLine + '              bookingNumber,' + [Environment]::NewLine + '              ',
    1
  )
}

Set-Content -LiteralPath $enginePath -Value $engine -Encoding UTF8

# Apply additive DB changes only. No reset and no deletion.
Write-Host 'Applying additive numbering SQL...' -ForegroundColor Yellow
npx prisma db execute --file prisma/numbering-migration.sql

Write-Host 'Generating Prisma client...' -ForegroundColor Yellow
npx prisma generate

Write-Host 'Checking TypeScript...' -ForegroundColor Yellow
npx tsc --noEmit

Write-Host 'Building production bundle...' -ForegroundColor Yellow
npm run build

Write-Host ''
Write-Host 'Ninja Zone V1 finalization completed successfully.' -ForegroundColor Green
Write-Host 'No prisma migrate reset was used.' -ForegroundColor Green
