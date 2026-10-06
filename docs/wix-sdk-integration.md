# Wix SDK Integration

## Current architecture

The BSDA frontend uses a Wix-managed Headless project with a custom Vite + React + TypeScript frontend.

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

The Wix-managed Headless client ID is read from the project's `wix.config.json` `appId`.

The client ID is a public identifier and may be present in frontend code. No client secret, API key, or other admin credential belongs in this client.

## Enabled Wix modules

The shared client currently exposes the modules needed for the BSDA foundation:

- `items` — Wix CMS/Data
- `members` — Wix Members authentication and member APIs
- `services` — Wix Bookings services
- `availabilityTimeSlots` — Wix Bookings appointment availability

Bookings creation, checkout/payment, CMS collection design, and admin authorization will be implemented behind the existing BSDA service contracts in later steps.

## Session handling

Visitor/member tokens are restored from browser `localStorage` under `wixSession` when the client is created.

The helper `persistWixSession()` stores the current token set returned by the Wix client. The authentication flow will call this after generating visitor tokens or completing member authentication.

## Security boundary

The browser client uses OAuth with the public Headless Client ID. Privileged admin operations must not use this browser client with secrets.

Admin credentials and server-only operations will be introduced through a separate backend adapter/service boundary when the Wix backend layer is implemented.

## Source of truth

This implementation follows the current Wix Headless documentation for custom frontends, specifically the current OAuth SDK client flow for Wix-managed Headless projects using frameworks other than Astro.
