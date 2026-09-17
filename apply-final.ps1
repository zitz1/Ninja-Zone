$ErrorActionPreference = 'Stop'
$project = 'C:\Users\Binkhalid\Downloads\ninja zone'
Set-Location $project

Write-Host 'Ninja Zone V1 finalization starting...' -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Copy the finished cashier files.
Copy-Item "$root\app\cashier\bookings\page.tsx" "$project\app\cashier\bookings\page.tsx" -Force
Copy-Item "$root\app\cashier\bookings\cashier-bookings.module.css" "$project\app\cashier\bookings\cashier-bookings.module.css" -Force
Copy-Item "$root\app\api\cashier\payments\route.ts" "$project\app\api\cashier\payments\route.ts" -Force
Copy-Item "$root\app\api\cashier\bookings\route.ts" "$project\app\api\cashier\bookings\route.ts" -Force
Copy-Item "$root\prisma\numbering-migration.sql" "$project\prisma\numbering-migration.sql" -Force

# Add stable public numbers to the existing Prisma models without replacing the schema.
$schemaPath = "$project\prisma\schema.prisma"
$schema = Get-Content $schemaPath -Raw

if ($schema -notmatch '(?ms)model Booking \{.*?bookingNumber String @unique') {
  $schema = [regex]::Replace($schema, '(?ms)(model Booking \{\r?\n\s*id\s+String\s+@id[^\r\n]*\r?\n)', '$1  bookingNumber                    String        @unique`r`n', 1)
}

if ($schema -notmatch '(?ms)model Payment \{.*?paymentNumber String @unique') {
  $schema = [regex]::Replace($schema, '(?ms)(model Payment \{\r?\n\s*id\s+String\s+@id[^\r\n]*\r?\n)', '$1  paymentNumber String @unique`r`n', 1)
}

Set-Content $schemaPath $schema -Encoding UTF8

# Make booking creation allocate a collision-safe human booking number from PostgreSQL.
$enginePath = "$project\lib\booking-engine.ts"
$engine = Get-Content $enginePath -Raw

if ($engine -notmatch 'ninja_zone_booking_number_seq') {
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
  $engine = $engine.Replace($needle, $insert + $needle)
  $engine = $engine.Replace('            data: {`r`n              userId,', '            data: {`r`n              userId,`r`n              bookingNumber,')
  Set-Content $enginePath $engine -Encoding UTF8
}

# Apply the additive DB change through Prisma's current connection.
# This does NOT reset the database and does NOT delete existing data.
npx prisma db execute --file prisma/numbering-migration.sql
npx prisma generate
npx tsc --noEmit
npm run build

Write-Host ''
Write-Host 'Ninja Zone V1 finalization completed.' -ForegroundColor Green
Write-Host 'No prisma migrate reset was used.' -ForegroundColor Green
