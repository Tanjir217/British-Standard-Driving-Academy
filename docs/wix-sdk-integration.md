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

The student portal uses the Wix Astro integration's built-in managed authentication flow. The branded `/login` screen redirects to `/api/auth/login`; Wix hosts the credential, registration, verification, and recovery flow. The Astro integration exchanges the OAuth response and manages the authenticated request session. Sign-out submits a POST to `/api/auth/logout`.

Do not use the custom Headless SDK `auth.login()` / `auth.register()` flow for the student portal. Wix's current documentation says this custom member-login flow is not supported by the Astro integration because it does not establish the session the integration expects.

The browser does not store or attach Wix member access tokens for student API calls. `GET /api/auth/session` reads the current member from the server-side Astro session and returns only the current member's basic identity.

## Security boundary

Student profile data is read server-side from `Members/FullData` using the Wix Astro-managed session. Lesson Records, bookings, enrollment, and learning-material endpoints also require that session. Protected student APIs resolve identity from the authenticated Wix member, match FullData by contactId where applicable, and enforce ownership on the server. They do not accept browser-supplied identity IDs or fall back to bearer tokens from the legacy browser OAuth client.

The browser-side Wix SDK client remains in the repository for existing non-portal integrations and legacy code; it is not an alternate authentication path for student portal endpoints. directly from React.

Pricing-plan enrollment uses Wix's current-member order API. Student learning videos use the existing managed `SiteContent` slots (`portal-video-1` through `portal-video-6`).

Keep StudentProfiles and LessonRecords Admin-only in Wix CMS. Do not make these collections publicly readable to support the student portal. The protected endpoint queries and field IDs must be verified against the actual Wix site before production use.

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
