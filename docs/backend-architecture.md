# BSDA Wix / Headless Architecture

## Frontend

The BSDA application is a custom Vite + React + TypeScript frontend. Vercel is used only to host/deploy the static frontend build.

Local development uses:

```bash
npm run dev
```

No Vercel development server or Vercel API functions are required.

## Wix is the application backend

The browser uses the Wix Headless SDK through `src/services/wix/client.ts`.

Wix remains the source of truth for:

- Members and authentication.
- Bookings, services, availability and staff.
- Pricing Plans.
- Booking/payment state.
- BSDA CMS data.

Page components call BSDA service modules under `src/services/*`; they do not import Wix modules directly.

## Admin authentication

Admin login uses the Wix member authentication flow:

1. `loginWithEmail()` authenticates the account with Wix.
2. The returned direct-login session is exchanged for Wix member tokens.
3. `validateAdminSession()` calls Wix Extended Bookings with the signed-in member token.
4. Wix enforces the caller's actual Bookings permissions.
5. Accounts without the required Wix administrative permission are denied.

There is no admin password stored in BSDA code and no Vercel API endpoint in the authentication path.

## Admin dashboard

The admin dashboard reads live Wix data directly through the shared Wix client:

- Extended Bookings → booking records.
- Bookings Services → service names and current service prices.
- Staff Members → instructor count.

The dashboard does not maintain a second database and does not use Vercel serverless functions as a proxy.

## Security boundary

This architecture does **not** mean every Wix collection is safe to expose through the browser.

Student Profiles and Lesson Records are configured as Admin-only Wix CMS collections. Those records must remain behind a protected backend boundary before student-specific CMS data is exposed.

For the current Vite/React project, that protected CMS boundary is a separate architectural decision. It is not implemented by adding arbitrary `api/*` files to the frontend repository.

## Booking flow

The public booking service already reads services and availability from Wix and creates bookings with a real Wix availability slot.

Payment/checkout remains a separate production step.

## Verification

Before production:

1. Run `npm install`.
2. Run `npm run build`.
3. Test member login/logout.
4. Test admin login with a Wix account that has the required Bookings permissions.
5. Test admin denial with a normal member account.
6. Verify live bookings, services and instructors in the admin dashboard.
7. Complete the protected CMS backend decision before exposing Student Profiles or Lesson Records.
