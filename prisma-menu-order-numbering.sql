BEGIN;

CREATE SEQUENCE IF NOT EXISTS ninja_zone_menu_order_number_seq;

ALTER TABLE "MenuOrder"
  ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;

WITH numbered AS (
  SELECT
    id,
    'NZ-O-' ||
      to_char("createdAt" AT TIME ZONE 'Asia/Baghdad', 'YYMMDD') ||
      '-' ||
      lpad(
        row_number() OVER (ORDER BY "createdAt" ASC, id ASC)::text,
        4,
        '0'
      ) AS public_number
  FROM "MenuOrder"
  WHERE "orderNumber" IS NULL
)
UPDATE "MenuOrder" AS mo
SET "orderNumber" = numbered.public_number
FROM numbered
WHERE mo.id = numbered.id;

DO $$
DECLARE
  order_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO order_count FROM "MenuOrder";

  IF order_count = 0 THEN
    PERFORM setval('ninja_zone_menu_order_number_seq', 1, false);
  ELSE
    PERFORM setval('ninja_zone_menu_order_number_seq', order_count, true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MenuOrder_orderNumber_key'
      AND conrelid = '"MenuOrder"'::regclass
  ) THEN
    ALTER TABLE "MenuOrder"
      ADD CONSTRAINT "MenuOrder_orderNumber_key" UNIQUE ("orderNumber");
  END IF;
END $$;

ALTER TABLE "MenuOrder"
  ALTER COLUMN "orderNumber"
  SET DEFAULT (
    'NZ-O-' ||
    to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Baghdad', 'YYMMDD') ||
    '-' ||
    lpad(nextval('ninja_zone_menu_order_number_seq')::text, 4, '0')
  );

ALTER TABLE "MenuOrder"
  ALTER COLUMN "orderNumber" SET NOT NULL;

COMMIT;
