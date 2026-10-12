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
