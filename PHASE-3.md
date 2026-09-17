# Ninja Zone — Phase 3

Mobile-first customer UI for the Ninja Zone gaming center.

## Included
- Dark neon visual system inspired by the supplied Ninja Zone identity.
- Responsive customer homepage.
- Service cards and pricing.
- Mobile-first booking modal.
- 7-day booking window UI.
- 30-minute start slots.
- Duration stepper (+/-) in 30-minute increments, minimum 30 minutes.
- Live availability check through `/api/availability`.
- Development-only demo customer endpoint for local booking tests.
- Booking submission through `/api/bookings` after availability is confirmed.

## Copy into the existing project
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `app/api/dev/demo-user/route.ts`
- `public/ninja-zone-logo.jpg`

This phase assumes the Phase 2 booking engine and the corrected Prisma setup already exist in the project.
