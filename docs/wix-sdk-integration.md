# Wix SDK Integration

## Current architecture

The BSDA frontend uses a Wix Headless project with a custom Vite + React + TypeScript frontend.

The Wix SDK is isolated under `src/services/wix` so React pages/components do not import Wix modules directly.

```text
React pages/components
        |
        v
src/services/*
        |
        v
src/services/wix
        |
        v
Wix JavaScript SDK
        |
        v
Wix Headless project
```

## Client configuration

The Wix Headless client ID is read from `wix.config.json` `appId`.

The client ID is a public identifier. No client secret, API key, or privileged server credential belongs in this browser client.

## Enabled Wix modules

The shared client currently exposes:

- Wix CMS/Data `items`
- Wix Members `members`
- Wix Pricing Plans V3 `plansV3`
- Wix Pricing Plan orders
- Wix Bookings `services`
- Wix Bookings `availabilityTimeSlots`
- Wix Bookings `bookings`
- Wix Bookings `extendedBookings`
- Wix Bookings `staffMembers`

## Public commercial source of truth

The public pricing pages now consume:

- Wix Pricing Plans V3 for package names and prices.
- Wix Bookings Services V2 for appointment-service names, descriptions and fixed prices.

React pages do not use the old hard-coded package/service prices from `src/data/site.ts` for the public pricing UI.

## Booking boundary

The booking service exposes BSDA-level operations:

- `listServices()`
- `getAvailability()`
- `create()`
- `getById()`

Availability must come from a live Wix appointment slot before a real booking can be created. The current public booking form is still a demo inquiry flow and does not yet perform Wix checkout/payment.

## Admin authentication and dashboard

Admin login uses the Wix member authentication flow.

After direct email/password authentication, the returned session is exchanged for Wix member tokens. The admin gate then performs a small `extendedBookings.queryExtendedBookings()` request using those member tokens.

Wix enforces the caller's actual Bookings permissions. An ordinary member is denied; a Wix account with the required administrator/Bookings permissions can continue to the dashboard.

The admin dashboard reads live Wix data directly through the same browser client:

- Extended Bookings → booking records.
- Bookings Services → service names and current service prices.
- Staff Members → instructor count.

There is no Vercel API/serverless proxy in the admin authentication or dashboard path.

## Authentication and session handling

The browser uses the current Wix `OAuthStrategy` with the public Headless client ID.

Anonymous visitor authentication is handled by the Wix SDK automatically on the first API call. Member login uses the current OAuth PKCE flow.

The current foundation keeps OAuth flow state and the temporary member token session in `sessionStorage`. It does not put Wix secrets or client secrets in the browser.

## Security boundary

Direct browser access is limited to Wix operations that are authorized for the current member token.

Student Profiles and Lesson Records are Admin-only Wix CMS collections. They therefore remain behind a future protected application backend boundary rather than being read directly from React.

Removing the Vercel `api/admin/*` functions does not remove this CMS security requirement. It only removes an unnecessary proxy for the current admin Bookings dashboard.

## Source-of-truth rules

Do not duplicate these as independent commercial state in React:

- Package prices
- Package entitlements
- Booking service prices
- Booking availability
- Payment state

Wix remains the source of truth for these business records.

## Verification before production

1. Run `npm install`.
2. Run `npm run build`.
3. Test member login/logout.
4. Test admin login with a Wix account that has the required Bookings permissions.
5. Test admin denial with a normal member account.
6. Verify live bookings, services and instructors in the admin dashboard.
7. Complete the protected CMS backend decision before exposing Student Profiles or Lesson Records.
8. Do not merge this branch into `test` until explicitly approved.
