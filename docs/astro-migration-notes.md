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

- `GET /api/students/profile`: reads the authenticated member's FullData profile; contactId is matched first, with email fallback only if Wix did not return contactId.
- `PATCH /api/students/profile`: updates the authenticated member's allowed personal fields in FullData or creates a pending row when no profile exists.
- `GET /api/students/lessons`: returns lesson rows from `LessonRecords` filtered by the authenticated student's FullData contactId.
- `GET /api/students/bookings`: queries Wix Bookings by `contactDetails.contactId` and rechecks ownership before returning results.
- `GET /api/students/enrollment`: reads only the current member's Pricing Plans orders.
- `GET /api/students/learning-materials`: returns enabled student-video slots from `SiteContent`.
- Profile writes target the same `Members/FullData` collection read by the profile endpoint. Only first name, last name, nickname, phone, and profile image URL are editable; contactId, loginEmail, status, and booking eligibility are server-controlled.
- Protected CMS access stays server-side and is never authorized by a browser-supplied contactId.
- Student login/registration use Wix Astro's built-in `/api/auth/login` and `/api/auth/logout` routes; do not use custom Headless `auth.login()` / `auth.register()` in the student portal.
- `GET /api/auth/session` exposes only the current member identity from the managed session. Student API clients use same-origin cookies and never attach browser-held member bearer tokens.

## Required before calling the endpoint production-ready

1. Confirm the actual Wix site context for managed member sessions. The student portal intentionally has no legacy OAuth-token fallback; verify the single Wix Astro-managed flow.
2. Confirm `LessonRecords.studentId` stores the student's FullData `contactId`, and confirm the exact collection ID and field IDs.
3. Verify `SiteContent` read permissions and that student portal keys `portal-video-1` through `portal-video-6` are enabled.
4. Verify the current-member Pricing Plans orders API is available in the deployed Wix context and returns plan names/statuses as expected.
5. Run install, type-check, build, local auth tests, Wix CMS/Bookings/Pricing Plans integration tests, and preview tests using the intended non-production Wix site.

## Do not

- Call the traditional Velo HTTP Functions API.
- Introduce Supabase, Vercel Functions, Express, or another backend.
- publish to `bsda.online` or merge to `main` before approval.


## Implemented endpoint source files on this branch

- `GET /api/students/profile`, `PATCH /api/students/profile`: read and edit the current student's FullData profile.
- `GET /api/students/lessons`, `/api/students/bookings`, `/api/students/enrollment`, and `/api/students/learning-materials`: authenticated student-specific data endpoints.
- `GET /api/admin/authorization`: fail-closed authorization against the protected `AdminStaffAccess` collection (`memberId`, `enabled` fields currently assumed from earlier repository work).
- `GET /api/admin/students`: protected StudentProfiles listing.
- `GET /api/admin/lessons`, `POST /api/admin/lessons`, `PATCH /api/admin/lessons`: protected lesson record operations.
- `GET /api/admin/bookings`: protected Wix Bookings listing.
- `GET /api/bookings/availability`: reads current Wix Bookings slots.
- `POST /api/bookings`: rechecks the requested slot against Wix availability before calling Wix Bookings create.

The public booking form now requires a live slot and a Wix booking reference before showing success. It explicitly does not claim that payment was collected or verified.

## Admin identity limitation

The current endpoint authorizes explicitly approved site-member staff records only. It does **not** yet grant access to Wix site owners or dashboard collaborators, because the Astro site-member session does not by itself prove a dashboard collaborator's Wix role. Do not treat the current admin authorization endpoint as satisfying the full owner/collaborator requirement. Verify the supported Wix identity model and implement that authorization path before production use.

## Login/session compatibility

The login page now offers the Wix Astro integration's built-in `/api/auth/login` flow in addition to the existing custom OAuth/email flow. The protected endpoints rely on the managed Wix session. The legacy custom login flow remains for compatibility but is not assumed to establish the Astro integration's cookie-backed session. Test both paths explicitly; use the managed flow for validating the new endpoints.

## Dependency lockfile and test status

`package.json` now declares Astro, React integration, Wix Astro integration, Wix essentials, the Wix fetch adapter, and Wix CLI scripts. The existing `package-lock.json` was regenerated from `package.json` in GitHub Actions and committed to this branch. Dependency resolution and `astro check` completed successfully in CI.

No local build, Wix CLI dev session, CMS read/write, authentication, or deployed-preview test has been claimed as passing in this branch. These checks require installing the dependencies and testing against a confirmed non-production Wix project with the real collection schemas.


## Verified dependency compatibility

GitHub Actions successfully resolved the pinned integration metadata from npm:

- `@wix/astro@2.75.2` requires Astro `^5.0.0` and React/React DOM `^18.3.1`.
- `@wix/astro-pages@2.0.8` requires Astro `^5.0.0`.
- `@astrojs/react@4.3.0` supports React 18 and React 19, but the Wix integration requires React 18.3.1.

The migration therefore pins the Wix Astro 2.x integration with Astro 5 and downgrades React 19 to React 18.3.1 to satisfy the Wix integration's peer requirements. This is a deliberate compatibility change and must be covered by the build and UI regression checks.

## Latest CI results and deployment blocker

- Dependency resolution: passed using the pinned Wix Astro 2.x + Astro 5 + React 18 toolchain.
- `npm run check`: passed with 0 errors. Remaining hints are an unused import in InstructorDetail and an unused legacy auth helper; Astro also warns that legacy React route components still live under `src/pages/`.
- `npm run build`: **blocked**. The installed CLI reports `error: unknown command 'build'` for the current repository configuration. This indicates the current `wix.config.json` project is not recognized as a Wix-managed Astro CLI project.
- `npm run build:astro`: not a valid substitute for release verification; the Wix Pages integration uses a `cloudflare:` runtime module that is only available through the expected Wix build runtime.

The official Wix docs for linking an existing Astro project state that `headless link` requires a project without `wix.config.json` and provisions a new Wix business/site. This repo already contains `wix.config.json`, the target site ID still needs reconciliation, and the operating guardrails prohibit creating a new Wix site. Therefore, **do not run `headless link`, overwrite site IDs, or publish**. The supported in-place path for this existing site must be established before the managed build, preview, endpoint integration tests, or production release can be completed.

## Wix OAuth redirect URI troubleshooting (October 2026)

The existing custom email/password and Google sign-in flow creates its OAuth callback using `new URL("/auth/callback", window.location.origin)`. Therefore, the callback must be allowlisted for each origin from which the app is tested.

Add these exact redirect URIs to the OAuth app's allowed redirect URI list in Wix Headless settings:

- Local Astro development: `http://localhost:4321/auth/callback`
- Production custom domain: `https://bsda.online/auth/callback`
- If the production site is also intentionally used on the www hostname, add `https://www.bsda.online/auth/callback` only if that hostname is configured and tested.

The user's screenshot showed the OAuth authorize endpoint returning `Invalid redirect URI. Please add an allowed URI to your OAuth App`. That response is a Wix OAuth configuration rejection, not a React Console exception. The actual `redirect_uri` query parameter should be checked in DevTools or the address bar if the error persists; allowlist the exact value, including scheme, host, port, path, and trailing-slash behavior. Do not add the entire authorize URL, wildcard URLs, query strings, or a client secret.

The React callback route is `/auth/callback`, and the local dev server in the current test is `http://localhost:4321`. After saving the allowed URI, retry account creation/sign-in and confirm that the browser returns to `/auth/callback` and the callback completes. The production URI is listed for later production verification; adding it does not mean the Astro backend has been deployed or that production login is currently working.



## Student profile self-service (2026-10-16)
- Portal profile editing writes only to `Members/FullData` through the protected PATCH endpoint.
- New records are marked pending so completing personal information cannot grant booking approval.
- The profile photo field accepts a public HTTPS URL or Wix Media URI; local file upload is not implemented.
- FullData elevated insert/update behavior and the actual `profilePhoto` CMS field type still require a live Wix integration test. No successful CMS write is claimed until that test passes.
