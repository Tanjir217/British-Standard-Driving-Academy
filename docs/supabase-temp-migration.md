# Temporary Supabase Migration Plan — BSDA

## Scope and safety boundary

- Working branch: `supabase-temp-migration`
- Base branch: `vercel-backend-test`
- Production: **unchanged**. Do not merge this branch or change the live domain/hosting without explicit approval.
- Keep the current React/Vite UI and routes wherever practical.
- Supabase becomes the source of truth for portal authentication, profiles, lessons, package catalogue/assignments, and staff access.
- Wix remains responsible for Bookings and payment/checkout services. Do not remove Wix SDK modules used by those integrations.
- Start with new Supabase test accounts. Existing Wix accounts/data are out of scope until a separate migration plan is approved.

## Current code findings

- `src/services/auth/authService.ts` and `src/services/wix/client.ts` implement Wix registration, verification, login, password reset, OAuth callback and Wix token persistence.
- `src/services/students/studentService.ts` calls Wix-oriented `/api/student/profile` and `/api/admin/students`.
- `src/services/lessons/lessonService.ts` is currently a placeholder and returns a protected-backend error.
- `src/services/packages/packageService.ts` reads public packages from Wix Pricing Plans.
- `src/pages/AdminGate.tsx` and `src/services/adminAuthService.ts` use Wix-specific admin authorization.
- `src/services/bookings/bookingService.ts` uses Wix Bookings and should remain Wix-backed during this migration.
- The admin dashboard contains hard-coded demonstration stats/bookings and currently labels live data as Wix data. These must not be mistaken for Supabase-backed production metrics.

## Implementation checklist

### Phase 0 — isolate and baseline
- [x] Create this migration branch from `vercel-backend-test`.
- [x] Inspect auth, student, lesson, package, booking, portal and admin entry points.
- [ ] Record the baseline build result locally before broad edits.
- [ ] Keep all changes on this branch; do not merge/deploy.

### Phase 1 — Supabase project and email
- [ ] Create/select the temporary Supabase project.
- [ ] Configure site URL and allowed redirect URLs for local testing and the approved staging origin.
- [ ] Choose a transactional SMTP provider and configure it in Supabase Auth.
- [ ] Set verification-required signup; test confirmation, login, logout, session restore and password reset.
- [ ] Keep the Supabase publishable/anon key in frontend configuration only; never expose the service-role/secret key.

### Phase 2 — database and access controls
- [x] Prepare an initial SQL migration for profiles, packages, package assignments, lesson records and staff access.
- [ ] Review and run the migration in the temporary Supabase project.
- [ ] Verify RLS using student A, student B, instructor and administrator test accounts.
- [ ] Seed staff access manually through trusted dashboard/SQL tooling; never let public signup assign roles.
- [ ] Add an explicit initial super-admin UUID only after the owner verifies the account identity.

### Phase 3 — frontend auth adapter
- [ ] Add a Supabase client module using environment variables.
- [ ] Replace Wix register/login/verify/reset/session/logout calls in the auth service with Supabase Auth.
- [ ] Update callback and route guards for Supabase session state.
- [ ] Remove Wix student-profile provisioning from auth callback.
- [ ] Keep Wix SDK integration for booking/services and any confirmed payment/checkout flow.

### Phase 4 — data service adapters
- [ ] Replace student profile read/create/update/list with Supabase queries.
- [ ] Implement lesson record queries with student/instructor/admin boundaries.
- [ ] Replace Wix Pricing Plans as the portal's package catalogue with Supabase packages.
- [ ] Add student package assignments; do not grant paid lessons from a browser redirect.
- [ ] Update admin dashboard service calls and remove misleading Wix status labels only where the data source changes.
- [ ] Preserve existing domain types and UI props where safe to avoid unnecessary visual changes.

### Phase 5 — Wix bookings and payment integration
- [ ] Keep booking service and availability calls connected to Wix.
- [ ] Decide how a Supabase user maps to a Wix booking contact/customer; do not assume a Supabase session is a Wix member session.
- [ ] Verify booking creation and retrieval still work after auth changes.
- [ ] If a Wix payment/checkout event grants a package, verify it server-side and process it idempotently before writing the assignment to Supabase.
- [ ] Document any flow that still requires a Wix member session.

### Phase 6 — validation and cutover
- [ ] Run `npm run build` and resolve TypeScript/build errors.
- [ ] Test verified signup, login, logout, session refresh, password reset and unverified-user denial.
- [ ] Test profile auto-provisioning and profile updates.
- [ ] Test student isolation, instructor limits, admin grants/revocation and denied access.
- [ ] Test packages, lesson records, booking integration and payment-to-assignment behavior.
- [ ] Confirm live `bsda.online` is unchanged.
- [ ] Obtain explicit approval before any production deployment or merge.

## Required environment variables

Frontend (safe to expose through the Vite build):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (or the project's publishable key, using the exact key type Supabase provides)

Server-side only, required only if a trusted server integration is added:
- `SUPABASE_SERVICE_ROLE_KEY` (never use in browser code or a `VITE_*` variable)

SMTP credentials belong in Supabase Auth SMTP settings, not in frontend environment variables or Git.

## Exit criteria

Migration is not considered complete until a fresh test student can verify their email, sign in, receive exactly one profile, see only their own records, and cannot access staff/admin functions; an explicitly granted admin can manage the intended data; Wix booking services still function; and the production site remains untouched.
