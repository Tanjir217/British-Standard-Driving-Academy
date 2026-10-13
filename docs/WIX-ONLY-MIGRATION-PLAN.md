# BSDA Wix-Only Migration Plan

Status date: 2026-10-12
Working branch: `test`
Repository: https://github.com/Tanjir217/British-Standard-Driving-Academy

## Non-negotiable scope

- All new work for this migration is made on `test` only.
- Do not commit migration work to `supabase-temp-migration`, `vercel-backend-test`, or other experimental branches.
- Wix is the only platform for backend, authentication, CMS/data, and server-side functions.
- Keep Wix Members, Wix Data/CMS, Wix Bookings, Wix Pricing Plans/checkout, and Wix backend services.
- Do not introduce Supabase, Vercel Functions, or another third-party backend/auth provider.
- Do not merge to `main`, publish the blank Studio site, change DNS, or alter production `bsda.online` without explicit user approval.
- Keep the current React/Vite frontend and visual design unless a specific Wix Studio integration constraint requires a deliberate, documented adjustment.

## Current source state

- React 19 + TypeScript + Vite + React Router 7 SPA.
- Build script: `tsc -b && vite build`; dev server commonly uses port 5173.
- Wix SDK dependencies: `@wix/sdk`, `@wix/members`, `@wix/data`, `@wix/bookings`, and `@wix/pricing-plans`.
- `wix.config.json` currently contains an app ID and site ID associated with the previously configured Wix project. Do not assume those IDs belong to the new blank Wix Studio site.
- `src/services/wix/client.ts` is the public/browser Wix Headless client and retains member, booking, data, and pricing-plan modules.
- `src/services/auth/authService.ts` handles Wix member registration/login/verification/password reset/session callbacks.
- `src/services/students/studentService.ts` calls Wix HTTP Functions for current profile and admin student records.
- `src/services/students/studentProfileProvisioningService.ts` calls the profile creation endpoint after login.
- `src/services/lessons/lessonService.ts` is incomplete/protected-backend placeholder and requires implementation.
- `src/services/packages/packageService.ts` uses Wix Pricing Plans; preserve checkout compatibility.
- `src/services/adminAuthService.ts` and `src/pages/AdminGate.tsx` perform Wix-backed staff authorization.
- `src/backend/http-functions.js` and `wix-site-backend/backend/http-functions.js` contain Wix backend HTTP function source. A GitHub copy does not prove it is deployed to either site.
- Wix CMS collections referenced include `StudentProfiles`, `Lesson Records`, and `AdminStaffAccess`.

## Observed student profile issue

The user reports the app builds and the `/portal` route loads on localhost and production. Browser console reports HTTP 404 for the student-profile endpoint. Treat this as an endpoint routing/deployment/target-site mismatch until proven otherwise; do not hide or suppress the error. Verify the exact request URL, deployed function name, response body, target site, and publication state before changing code.

## Migration sequence

### Phase 0 — Establish safe target
1. Inspect the blank Wix Studio project's GitHub connection and Dev Mode/backend options.
2. Identify the blank site's exact site ID and whether Wix Studio supports the current Vite SPA structure directly or requires a different project layout.
3. Confirm how backend code is previewed/published and which site receives it.
4. Do not connect the existing repository to Wix GitHub integration until its write, sync, and publish behavior is understood.

### Phase 1 — Reproduce and fix the 404
1. On branch `test`, inspect endpoint caller paths and backend exported HTTP function names.
2. Compare the browser's exact request URL with the actual Wix HTTP Functions route and published site.
3. Verify backend function source is in the supported Wix Studio/Velo location and that it is published to the intended development site.
4. Verify collection IDs and permissions for `StudentProfiles` and `AdminStaffAccess`.
5. Test profile creation and profile retrieval with an authenticated test member. Keep errors visible and actionable.

### Phase 2 — Wix backend foundation
1. Use Wix Members as the identity provider.
2. Use Wix backend modules/web methods/HTTP functions supported by the target Studio site for privileged operations.
3. Derive the authenticated member identity from trusted Wix server context; never trust a member ID supplied by the browser.
4. Keep `StudentProfiles`, `Lesson Records`, and `AdminStaffAccess` access controlled. Ordinary members must not access staff lists or other students' private records.
5. Define and test role checks for site owner/admin and explicitly authorized staff. Fail closed on errors.

### Phase 3 — Complete portal services
1. Complete student profile provisioning and retrieval.
2. Implement lesson record reads/writes with student/instructor/admin access boundaries.
3. Implement admin student management through the backend.
4. Preserve Wix Pricing Plans and checkout. Avoid duplicate package catalogues unless there is a documented reason.
5. Preserve Wix Bookings and test booking and payment flows independently of portal authentication.

### Phase 4 — Verification
- New member registration, email verification, login, logout, session restore, and password reset.
- Profile creation on first sign-in and subsequent profile retrieval.
- Student cannot access another student's profile or lesson records.
- Ordinary member is denied admin endpoints.
- Site owner/authorized staff can access only permitted admin functions.
- Lesson records and package data display correctly.
- Bookings and checkout still work.
- `npm ci` and `npm run build` pass on `test`.
- Test Wix preview/publication on the blank development site before any production switch.

## Acceptance gates

No production migration until the user explicitly approves it after tests pass. No claim that a backend function works until its endpoint has been invoked against the intended Wix test site and the returned status/body verified. A local Vite build alone is not a backend deployment test.
