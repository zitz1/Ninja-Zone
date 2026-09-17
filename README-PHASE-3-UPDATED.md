# Ninja Zone — Updated Customer UI

This update implements the requested customer experience:

- Premium dark/neon Ninja Zone hero
- Mobile-first responsive layout
- Main navigation: Home, My Bookings, Menu, Support, Account
- Booking opens from a service category
- Date selection up to 7 days ahead
- Start time in 30-minute increments
- Duration +/- in 30-minute increments, minimum 30 minutes
- Availability is loaded from the backend for the selected service/date/time/duration
- Customer can select specific resource numbers and multiple resources
- Booking request submits selected resource IDs to the backend
- My Bookings displays submitted bookings in the current session
- Support chat UI
- Menu UI placeholder ready for admin-managed items
- Account UI placeholder for OTP phase

## Files to replace

Copy these files into the existing Ninja Zone project and overwrite the matching files:

- `app/page.tsx`
- `app/globals.css`
- `app/api/availability/route.ts`
- `app/api/bookings/route.ts`
- `lib/booking-engine.ts`

Do NOT overwrite your `.env`, `prisma/`, `prisma.config.ts`, or `lib/prisma.ts`.

After copying, run:

```powershell
npx tsc --noEmit
```

Then:

```powershell
npm run dev
```
