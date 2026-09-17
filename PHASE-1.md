# Ninja Zone — Phase 1 status

Completed:
- Next.js / TypeScript project scaffold
- PostgreSQL connection template
- Prisma schema for customers, OTP challenges, resources, pricing, bookings, sessions, payments, invoices and audit logs
- Resource inventory seed for 8 Normal PCs, 8 Master/VIP PCs, 10 PS5, 4 Cinema rooms, 2 Billiard tables and 8 independent Tables
- Pricing seed with minimum 30-minute duration
- Booking model supports pending expiry (`expiresAt`) for the 15-minute approval window
- Roles: CUSTOMER, CASHIER, MANAGER, ADMIN
- Resource statuses: AVAILABLE, RESERVED, PLAYING, MAINTENANCE, DISABLED

Business rules to implement in application services:
- Hours: 10:00 AM to 3:00 AM
- Start times every 30 minutes
- Minimum duration: 30 minutes
- +/- duration control changes by 30 minutes
- Maximum advance booking: 7 days
- Pending approval expires after 15 minutes
- Cancellation >= 2 hours: customer allowed
- Cancellation < 2 hours: staff review
- No-show grace period: 15 minutes
- Auto-assign an available resource of the selected type
- Extension only when the next period is available
- Payment at venue for v1
