-- Ninja Zone V1: stable human-facing booking numbers.
-- Does NOT reset or delete existing data.

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS "bookingNumber" TEXT;

CREATE SEQUENCE IF NOT EXISTS "ninja_zone_booking_number_seq";

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Booking"
  WHERE "bookingNumber" IS NULL
)
UPDATE "Booking" b
SET "bookingNumber" =
  'NZ-B-' ||
  TO_CHAR((b."createdAt" AT TIME ZONE 'Asia/Baghdad'), 'YYMMDD') ||
  '-' ||
  LPAD(ordered.rn::TEXT, 4, '0')
FROM ordered
WHERE b.id = ordered.id;

SELECT setval(
  'ninja_zone_booking_number_seq',
  GREATEST((SELECT COUNT(*) FROM "Booking"), 1),
  true
);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key"
ON "Booking"("bookingNumber");

ALTER TABLE "Booking"
ALTER COLUMN "bookingNumber" SET NOT NULL;
