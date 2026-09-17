NINJA ZONE V1 FINALIZATION PACK

This pack finalizes:
- cashier bookings accordion
- cash payment recording through the cashier bookings API
- independent payments API
- stable public booking/invoice/payment numbers
- responsive compact booking UI

Target project:
C:\Users\Binkhalid\Downloads\ninja zone

Apply:
1. Extract this folder.
2. Open PowerShell.
3. Run:
   Set-ExecutionPolicy -Scope Process Bypass
   .\apply-final.ps1

The script uses `npx prisma db execute` for the additive numbering change.
It does NOT run migrate reset and does NOT delete existing data.

Human-facing numbering:
NZ-B-YYMMDD-XXXX
NZ-INV-YYMMDD-XXXX
NZ-PAY-YYMMDD-XXXX

Internal CUIDs remain internal.
