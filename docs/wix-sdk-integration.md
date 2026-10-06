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
- Wix Bookings `staffMembers`

## Public commercial source of truth

The public pricing pages now consume:

- Wix Pricing Plans V3 for package names and prices.
- Wix Bookings Services V2 for appointment-service names, descriptions and fixed prices.

React pages do not use the old hard-coded package/service prices from `src/data/site.ts` for the public pricing UI.

Wix's current Plans V3 documentation confirms that public plans expose their pricing under `pricingVariants[0].pricingStrategies[0].flatRate.amount`, with the plan currency on the plan object. Wix Bookings Services exposes fixed service pricing under `payment.fixed.price`.

## Booking boundary

The booking service exposes BSDA-level operations:

- `listServices()`
- `getAvailability()`
- `create()`
- `getById()`

Availability must come from a live Wix appointment slot before a real booking can be created. The current public booking form is still a demo inquiry flow and does not yet perform Wix checkout/payment.

## Authentication and session handling

The browser uses the current Wix `OAuthStrategy` with the public Headless client ID.

Anonymous visitor authentication is handled by the Wix SDK automatically on the first API call. Member login uses the current OAuth PKCE flow.

The current foundation keeps OAuth flow state in `sessionStorage` only. It does not persist Wix access/refresh tokens in `localStorage`. Persistent visitor/member session storage is a separate production authentication task and must follow the current Wix visitor/member token guidance.

## Security boundary

Privileged admin operations must not use the browser Wix client with secrets.

Student Profiles and Lesson Records are Admin-only Wix CMS collections. They therefore remain behind the planned protected application API/backend boundary rather than being read directly from React.

## Source-of-truth rules

Do not duplicate these as independent commercial state in React:

- Package prices
- Package entitlements
- Booking service prices
- Booking availability
- Payment state

Wix remains the source of truth for these business records.

## Verification before production

1. Run `npm install` and `npm run build`.
2. Verify all four BSDA Pricing Plans load with the expected prices.
3. Verify the configured Bookings services load with their current prices.
4. Verify availability for real appointment services.
5. Implement the production booking/checkout flow.
6. Complete the protected backend decision for Student Profiles and Lesson Records.
7. Re-test authorization with student, instructor and admin identities.
8. Do not merge this branch into `test` until explicitly approved.
