# BSDA Astro + Wix migration notes

## Status

This branch introduces an Astro entry point and server endpoint source files while preserving the existing React pages and styles. It is a migration baseline, not a verified deployment.

## Critical Wix site binding rule

The existing repository already contains `wix.config.json` with a Wix site ID. Wix's current "Connect an Existing Astro Project" flow requires an Astro project that is not already linked and states that `headless link` provisions a Wix business and site. Do not run that command against this repository until Wix confirms the supported process for retaining the existing `bsda.online` site and current IDs.

The Wix Astro integration, endpoint code, and CLI package must be validated against a real Wix CLI scaffold before release. The site ID in `wix.config.json` must not be overwritten by guesswork.

## React migration approach

- Existing page components, shared layout, CSS, and React Router route definitions remain the presentation source of truth.
- `src/astro/BSDAClient.tsx` hosts the current client-side router as an Astro React island.
- Astro owns the HTTP endpoint namespace under `src/pages/api/`.
- This first bridge intentionally does not claim full server-rendered SEO or production-ready auth; route-level SSR and metadata should be migrated after the official Wix project binding is established.

## Student profile endpoint contract

- `GET /api/students/profile`: 401 if no authenticated Wix member; 200 with `profileState: "missing"` and `profile: null` if the member has no profile; 200 with a safe profile otherwise.
- `POST /api/students/profile`: validates JSON and names, derives member identity from the Wix session, returns an existing profile on repeat requests, or attempts to insert a new record.
- The member ID in the request body is never trusted.
- CMS access is elevated only inside server code and only after the authenticated member is identified.

## Required before calling the endpoint production-ready

1. Verify the exact StudentProfiles collection ID and field keys in the intended Wix site.
2. Verify the site's schema accepts the fields written by the endpoint and confirm collection permissions.
3. Confirm that the Wix Astro integration supplies the expected member context for this request and that the frontend login flow establishes that session. The existing Vite OAuth/session flow is not assumed to be interchangeable with the integration's built-in `/api/auth/login` and `/api/auth/logout` routes.
4. Add an enforced uniqueness strategy for the memberId ownership field to eliminate races between simultaneous profile-creation requests.
5. Run install, type-check, build, local auth tests, CMS read/write tests, and preview tests using the installed Wix CLI and the intended non-production Wix site.

## Do not

- Call the traditional Velo HTTP Functions API.
- Introduce Supabase, Vercel Functions, Express, or another backend.
- publish to `bsda.online` or merge to `main` before approval.


## Implemented endpoint source files on this branch

- `GET /api/students/profile`: authenticated member's profile or a structured missing-profile state.
- `POST /api/students/profile`: validates name fields, derives member ID from the Wix session, returns an existing profile on repeat calls, and uses a deterministic item ID to reduce duplicate creation races.
- `PATCH /api/students/profile`: member-owned updates limited to name, phone, and transmission fields.
- `GET /api/admin/authorization`: fail-closed authorization against the protected `AdminStaffAccess` collection (`memberId`, `enabled` fields currently assumed from earlier repository work).
- `GET /api/admin/students`: protected StudentProfiles listing.
- `GET /api/admin/lessons`, `POST /api/admin/lessons`, `PATCH /api/admin/lessons`: protected lesson record operations.
- `GET /api/bookings/availability`: reads current Wix Bookings slots.
- `POST /api/bookings`: rechecks the requested slot against Wix availability before calling Wix Bookings create.

The public booking form now requires a live slot and a Wix booking reference before showing success. It explicitly does not claim that payment was collected or verified.

## Admin identity limitation

The current endpoint authorizes explicitly approved site-member staff records only. It does **not** yet grant access to Wix site owners or dashboard collaborators, because the Astro site-member session does not by itself prove a dashboard collaborator's Wix role. Do not treat the current admin authorization endpoint as satisfying the full owner/collaborator requirement. Verify the supported Wix identity model and implement that authorization path before production use.

## Login/session compatibility

The login page now offers the Wix Astro integration's built-in `/api/auth/login` flow in addition to the existing custom OAuth/email flow. The protected endpoints rely on the managed Wix session. The legacy custom login flow remains for compatibility but is not assumed to establish the Astro integration's cookie-backed session. Test both paths explicitly; use the managed flow for validating the new endpoints.

## Dependency lockfile and test status

`package.json` now declares Astro, React integration, Wix Astro integration, Wix essentials, the Wix fetch adapter, and Wix CLI scripts. The existing `package-lock.json` has **not yet been regenerated** because the working environment could not clone the repository or reach npm. Run `npm install` in the working clone and commit the resulting lockfile before relying on `npm ci`.

No local build, Wix CLI dev session, CMS read/write, authentication, or deployed-preview test has been claimed as passing in this branch. These checks require installing the dependencies and testing against a confirmed non-production Wix project with the real collection schemas.
