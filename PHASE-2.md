# Ninja Zone — Phase 2: Booking Engine

Added:
- Prisma singleton using the Prisma 7 PostgreSQL adapter.
- Availability API: GET /api/availability?type=PS5&date=YYYY-MM-DD&time=20:00&duration=60
- Booking API: POST /api/bookings
- Minimum duration: 30 minutes.
- Duration changes in 30-minute steps.
- Booking window: 7 days.
- Pending approval window: 15 minutes.
- Automatic ignoring/expiring of old pending bookings during booking operations.
- Automatic allocation of an available physical resource.
- Serializable transaction + retry for concurrent booking races.
- Prices come from the Pricing table, never from the browser.

## Development-only booking test

Until OTP/session auth is built, POST /api/bookings requires:

x-demo-user-id: <real User.id>

This header is intentionally rejected in production.

## Example availability request

GET /api/availability?type=PS5&date=2026-09-02&time=20:00&duration=90

## Example booking body

{
  "items": [
    {
      "resourceType": "PS5",
      "startAt": "2026-09-02T20:00:00+03:00",
      "durationMinutes": 90,
      "quantity": 1
    },
    {
      "resourceType": "PC_MASTER",
      "startAt": "2026-09-02T20:00:00+03:00",
      "durationMinutes": 120,
      "quantity": 2
    }
  ],
  "customerNote": "Near the entrance"
}
