-- Ninja Zone V1 numbering. No reset / no data deletion.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bookingNumber" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentNumber" TEXT;
CREATE SEQUENCE IF NOT EXISTS "ninja_zone_booking_number_seq";
CREATE SEQUENCE IF NOT EXISTS "ninja_zone_invoice_number_seq";
CREATE SEQUENCE IF NOT EXISTS "ninja_zone_payment_number_seq";

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Booking" WHERE "bookingNumber" IS NULL
)
UPDATE "Booking" b SET "bookingNumber" = 'NZ-B-' || TO_CHAR((b."createdAt" AT TIME ZONE 'Asia/Baghdad'), 'YYMMDD') || '-' || LPAD(ordered.rn::TEXT, 4, '0')
FROM ordered WHERE b.id = ordered.id;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "paidAt", id) AS rn
  FROM "Payment" WHERE "paymentNumber" IS NULL
)
UPDATE "Payment" p SET "paymentNumber" = 'NZ-PAY-' || TO_CHAR((p."paidAt" AT TIME ZONE 'Asia/Baghdad'), 'YYMMDD') || '-' || LPAD(ordered.rn::TEXT, 4, '0')
FROM ordered WHERE p.id = ordered.id;

SELECT setval('ninja_zone_booking_number_seq', GREATEST((SELECT COUNT(*) FROM "Booking"), 1), true);
SELECT setval('ninja_zone_invoice_number_seq', GREATEST((SELECT COUNT(*) FROM "Invoice"), 1), true);
SELECT setval('ninja_zone_payment_number_seq', GREATEST((SELECT COUNT(*) FROM "Payment"), 1), true);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key" ON "Booking"("bookingNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_paymentNumber_key" ON "Payment"("paymentNumber");
ALTER TABLE "Booking" ALTER COLUMN "bookingNumber" SET NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "paymentNumber" SET NOT NULL;
