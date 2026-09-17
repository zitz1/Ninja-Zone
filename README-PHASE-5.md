# Ninja Zone — Premium Customer UI Phase 5

This phase replaces the earlier customer-facing visual layer with a more premium, restrained gaming-center design.

## Product structure

- Home is separate from Sections.
- Sections is a dedicated category page.
- Every category opens its own booking page at `/book/[type]`.
- Booking flow remains: date → arrival time → duration → resource/device selection → booking request.
- Customer navigation includes Home, Sections/Booking, My Bookings, Menu, Support, Account.
- Mobile-first layout with a fixed bottom navigation bar; desktop uses a compact top navigation.

## Visual direction

- Dark premium base rather than constant neon glow.
- Purple/cyan/pink are accents only.
- Strong spacing, typography, borders and hierarchy to avoid an obvious AI-generated look.
- User-supplied Ninja Zone logo is isolated to the logo asset.

## Files changed

- `components/customer-shell.tsx`
- `app/page.tsx`
- `app/sections/page.tsx`
- `app/globals.css`
- `public/ninja-zone-logo.png`

Do not overwrite `.env`, `prisma/`, `prisma.config.ts`, or your database/backend files.

After copying, run:

```powershell
npx tsc --noEmit
npm run dev
```
