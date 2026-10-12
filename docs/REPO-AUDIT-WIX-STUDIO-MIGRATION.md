# BSDA Repository Audit — Wix Studio Migration

Audit date: 2026-10-12
Audited branch: `test`
Audited commit: `181e6d839e602d2475fab8492d8473c4c59d76ac`

## Safety and branch scope

All follow-up implementation work for this task must be committed directly to `test`. Do not work on `supabase-temp-migration`, `vercel-backend-test`, or other experimental branches for this task. Do not merge to `main`, publish the Wix Studio site, change DNS/domain routing, or deploy production as part of the audit.

## Project shape

The repository is a custom React 19 + TypeScript + Vite single-page application using React Router 7. The browser entry and route definitions are in `src/App.tsx`; Vite serves local development on port 5173. `npm run build` runs `tsc -b && vite build`. TypeScript is strict, ES modules use bundler resolution, and JSX uses `react-jsx`.

Primary public routes:
- `/` Home
- `/booking` Booking
- `/packages` Packages
- `/lessons` Lessons
- `/instructors` and `/instructors/:instructorId`
- `/portal` Student portal
- `/login` and `/auth/callback`
- `/admin/login` and `/admin/*`
- `/faq`, `/about`, `/contact`, `/join-our-team`

The app also recognizes query-marker routes at the root for Wix/static-hosting callback compatibility: `?bsdaAdmin=login`, `?bsdaAdmin=dashboard`, and `?bsdaAuth=callback`.

## Dependencies and build/deployment configuration

- React `^19.1.1`, React DOM `^19.1.1`, React Router DOM `^7.9.4`.
- Wix SDK `@wix/sdk` plus `@wix/members`, `@wix/bookings`, `@wix/data`, and `@wix/pricing-plans`.
- Wix CLI is a development dependency.
- No Supabase SDK dependency is present on `test` at the audited commit.
- `wix.config.json` declares project type `Site`, an app ID, a site ID, and `./dist` as output directory. Treat these identifiers as belonging to the currently configured Wix site; do not assume they match the new blank Wix Studio site.
- `vercel.json` rewrites all routes to `/index.html`, supporting SPA deep links on Vercel.
- `.wix/topology.json` is part of the Wix CLI project metadata.
- `package-lock.json` is present and must be kept in sync with `package.json` after dependency changes.

## Wix client and integration boundaries

`src/services/wix/client.ts` creates the browser-side Wix Headless SDK client using `OAuthStrategy` and the app ID in `wix.config.json`. It registers modules for:
- Members
- Data
- Pricing Plans
- Bookings, extended bookings, services, availability time slots, and staff members

The client persists member tokens in `sessionStorage`. The code comments explicitly say privileged CMS operations must not be performed from the browser. Wix Bookings and pricing-plan/payment-related flows are in use and must be preserved during any migration.

## Existing backend experiments and Wix server-side source

The audited branch includes:
- `src/backend/http-functions.js` — Wix Velo HTTP Functions source for admin authorization and student profile operations.
- `wix-site-backend/backend/http-functions.js` — mirrored backend source copy.
- `api/content.ts` — a Vercel-style API route for site content; inspect before any deployment changes.
- `vercel.json` — SPA rewrite configuration.

The Wix backend source defines endpoints including:
- `adminAuthorization`
- `createStudentProfile`
- `currentStudentProfile`
- `studentProfiles`

The backend attempts to use Wix's authenticated member context and Wix CMS collections `AdminStaffAccess` and `StudentProfiles`. It uses an explicit allowed-origin list and is intended to fail closed on authorization errors. The source comments note that committing code to GitHub alone does not prove that the Wix backend endpoint has been deployed or published.

## Authentication, student, lessons, packages, admin

- `src/services/auth/authService.ts` implements Wix member login, registration, email verification, password reset, OAuth callback handling, and token persistence.
- `src/services/students/studentProfileProvisioningService.ts` calls the Wix `createStudentProfile` endpoint after authentication.
- `src/services/students/studentService.ts` calls Wix HTTP Functions endpoints to load the current student's profile and administrator student list.
- `src/services/lessons/lessonService.ts` is currently a protected-backend placeholder rather than a complete live lesson-record implementation.
- `src/services/packages/packageService.ts` uses Wix Pricing Plans; preserve this integration where needed for Wix checkout.
- `src/services/adminAuthService.ts` and `src/pages/AdminGate.tsx` enforce an admin gate using the Wix session and server-side authorization validation.
- `src/pages/Portal.tsx` loads the signed-in member, site content, and current student profile. It logs limited profile fields in development mode.
- Admin dashboard and booking/payment-related services require separate review for live-vs-demo data before claiming they are production-ready.

## Risks and migration implications

1. A Wix Studio blank site is a different site from the configured site IDs in `wix.config.json`. Connecting GitHub or deploying without confirming the target could bind code to the wrong Wix site.
2. Wix Studio's GitHub integration should not be assumed to convert the existing Vite SPA into native Wix pages. First verify the integration's supported project layout and deployment behavior.
3. The existing Vite app depends on `index.html`, `src/main.tsx`/React entry, Vite build output, and SPA routing. Native Wix page/backend source has a different runtime/deployment model.
4. Wix Bookings, Pricing Plans, member auth, and checkout should not be removed while evaluating Supabase or Wix Studio migration.
5. Browser-held Wix access tokens and direct browser calls to privileged APIs need security review. The server must derive identity from a verified Wix request context, never a browser-supplied member ID.
6. A successful GitHub commit or local build is not evidence that Wix backend HTTP Functions are deployed or reachable.
7. No build or runtime test was performed as part of this repository-source audit; this document records source inspection only.

## Recommended next steps

1. Confirm whether the new blank Wix Studio site's GitHub integration expects a Wix-native Git repository/project structure or can safely connect to this existing repository without overwriting it.
2. Keep the existing repository and branch `test` as the source of truth. Do not connect a second site to a branch until the Wix integration's write/publish behavior is understood.
3. Run `npm ci` and `npm run build` in a local clone of `test`; fix existing compile errors on `test` only.
4. Verify the existing Wix site IDs and current Git integration target against the dashboard before any deployment.
5. In a separate controlled test, deploy and invoke the Wix backend endpoints against the intended Wix Studio test site; verify member identity, admin denial, student self-access, and CORS behavior.
6. Decide Wix-vs-Supabase per responsibility only after the site integration/deployment boundary is confirmed. Keep Wix Bookings/checkout intact.
7. Do not merge to `main` or alter `bsda.online` until explicit approval after acceptance testing.
