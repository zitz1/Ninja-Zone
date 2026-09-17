# Ninja Zone — Phase 4 Customer Experience

This patch replaces the earlier single-page customer UI with a section-first flow closer to the requested reference experience:

- Home is a premium landing page, not the booking screen.
- `/sections` is the categories page.
- Each category has its own booking page at `/book/[type]`.
- Booking flow: date → start time in 30-minute slots → duration in 30-minute steps → specific resource numbers → submit request.
- Multiple specific resources can be selected within the same booking request.
- Customer navigation: Home, My Bookings, Booking, Menu, Support, Account.
- Mobile-first responsive layout, then desktop.
- Visual language uses restrained neon accents, darker surfaces, spacing, and typography instead of an all-neon aesthetic.
- Logo asset is tightly cropped from the supplied logo screenshot and used without the surrounding social UI.

## Files to copy
Copy the files/folders in this patch into the main Ninja Zone project and replace matching files:

- `app/page.tsx`
- `app/globals.css`
- `app/sections/page.tsx`
- `app/book/[type]/page.tsx`
- `app/bookings/page.tsx`
- `app/menu/page.tsx`
- `app/support/page.tsx`
- `app/account/page.tsx`
- `components/customer-shell.tsx`
- `components/booking-flow.tsx`
- `lib/services.ts`
- `public/ninja-zone-logo.png`

Do not replace `.env`, `prisma/`, `prisma.config.ts`, or the existing backend files.
