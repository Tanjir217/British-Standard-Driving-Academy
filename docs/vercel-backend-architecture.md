# BSDA Vercel API Architecture and Implementation Plan

**Status:** Approved architecture direction; implementation plan only.  
**Target branch:** `vercel-backend-test`  
**Base branch:** `test`  
**Production changes:** None. Do not merge this branch or deploy production without explicit approval.

## 1. Confirmed decisions

- Wix CMS remains the single source of truth for BSDA CMS data.
- Wix Members remains the member identity and login provider.
- Vercel provides a server-side API boundary for identity verification, authorization, and protected operations.
- The admin dashboard requests protected student/staff data through Vercel; it does not query Admin-only CMS collections directly from the browser.
- Student profile provisioning is automatic and idempotent after successful member registration/login.
- Existing React/Vite UI and Wix commercial data (Bookings, Services, Pricing Plans) should remain intact unless a separate approved task requires changing them.

## 2. Target architecture

```text
React + Vite frontend
  |-- Wix OAuth/member login (existing Wix SDK)
  |-- Public Wix APIs for public content, packages, bookings/availability
  |-- /api/* for protected application operations
             |
             v
       Vercel Functions
       - validate the presented Wix member session/token with Wix
       - derive member identity from the validated Wix response
       - enforce student/staff/admin authorization server-side
       - use server-only Wix API credentials for protected CMS access
             |
             v
       Wix APIs / Wix CMS (system of record)
       - StudentProfiles
       - AdminStaffAccess
       - Lesson Records and future protected collections
       - existing Bookings / Services / Pricing Plans remain in Wix
```

Vercel is an application/security boundary, not a second database and not a replacement for Wix member accounts.

## 3. Security invariants

1. Never trust `memberId`, email, role, or an `isAdmin` flag supplied in the request body or query string.
2. Every protected request must validate the Wix member access token/session using a supported Wix identity API before any privileged CMS operation.
3. Use a Wix API key only on the server, stored in Vercel environment variables. Never prefix secrets with `VITE_`, commit real secrets, or return credentials to the browser.
4. After identity validation, derive the member ID from Wix's response. Check staff access by that ID against the protected `AdminStaffAccess` collection.
5. Admin authorization must fail closed on missing/invalid identity, failed Wix calls, missing collections, or uncertain permissions.
6. Students can read only their own StudentProfiles record. Only authorized admin/staff users can list the student directory.
7. Profile creation must be idempotent: one profile per Wix member ID, including retries and duplicate requests.
8. Apply request method/schema validation, bounded pagination, no-store caching for private responses, CORS allowlisting, and safe error messages. CORS is not an authorization mechanism.
9. Never log access tokens, API keys, passwords, or full sensitive student records.
10. Keep the existing Wix browser client for supported public/member-scoped features; remove browser calls to the broken `wixapis.com/velo/v1/http/invoke/*` endpoints as each equivalent Vercel route is implemented and tested.

## 4. Proposed API contract

All routes are same-origin under `/api` in production. Local testing should use Vercel's local development runtime so API routes behave like deployments.

| Method and route | Purpose | Authorization |
|---|---|---|
| `GET /api/health` | Liveness/configuration-safe diagnostic; reveals no secrets | Public; returns only safe status |
| `GET /api/auth/session` | Validate the current Wix member token and return minimal identity information | Valid Wix member token |
| `POST /api/student/profile` | Ensure current member has a StudentProfiles record | Valid Wix member token; identity comes from Wix, not request body |
| `GET /api/student/profile` | Return the current member's own profile | Valid Wix member token; query by server-derived member ID |
| `GET /api/admin/authorization` | Check Wix owner/admin or explicitly enabled staff authorization | Validated identity plus server-side permission check |
| `GET /api/admin/students` | List student CMS records for the admin dashboard | Authorized admin/staff only; bounded pagination |
| `GET /api/public/packages` (optional) | API proxy only if a public Wix API cannot safely/appropriately serve the data directly | Public data only; never return privileged fields |

Use `401` for missing/invalid identity, `403` for authenticated but unauthorized users, `400` for invalid input, and generic `500` responses for unexpected server failures. Do not expose Wix raw error payloads to the browser.

## 5. Wix data and authorization

### Wix CMS

Wix CMS remains canonical. The server-side Wix API client uses the site's ID and a restricted Wix API key with only the required permissions. Confirm the exact permissions available for the chosen Wix API endpoints before creating or storing the key.

### StudentProfiles

Use the existing collection ID `StudentProfiles` only after confirming it is the actual CMS collection ID. Confirm field IDs for at least:

- `memberId` (stable Wix member ID; indexed/unique if supported)
- `fullName`
- `email`
- `phone`
- `transmission`
- `assignedInstructorId`
- `enrolledPlanId` or the actual existing package field ID
- `lessonsCompleted`
- `lessonsRemaining`
- `progressPercent`
- `status`
- `joinedDate`
- `profilePhotoUrl` if present

The repo has used both `enrolledPackageId` and `enrolledPlanId` in different layers. Reconcile this mapping against the real Wix CMS field IDs before writing or mapping records. Do not rename fields or mutate existing CMS data without approval.

### AdminStaffAccess

Keep this collection private/Admin-only. Staff authorization is a server-side lookup by validated member ID with `enabled = true`. Do not expose the staff access list through any public API.

The owner/collaborator path must be verified against a supported Wix API/authorization mechanism. Do not assume Wix site collaborators are ordinary site members or trust a client-side Wix role claim. If the supported server-side owner/collaborator check cannot be established, stop and report the exact limitation rather than silently weakening the rule.

## 6. Login and registration flow

1. User signs up/signs in through the existing Wix Members flow.
2. Frontend completes the existing Wix token exchange.
3. Frontend calls `POST /api/student/profile` with the Wix member access token in the Authorization header. It sends no trusted identity fields.
4. Vercel validates that token with Wix and obtains the canonical member ID and member contact/profile data from Wix.
5. Vercel checks `StudentProfiles` for the server-derived member ID.
6. If a record exists, return success without creating a duplicate. If none exists, create it using the approved field mapping and safe defaults.
7. Profile-provisioning failure must be visible in diagnostics and retryable; it must not silently mark a profile as created.
8. Student portal calls `GET /api/student/profile`; the API uses the validated identity to return only that student's record.

Do not create a profile from unverified email/name data submitted by the browser. If Wix does not expose a required contact field to the validated member token, use a supported server-side Wix member API to retrieve it or require an explicit profile-completion step.

## 7. Admin dashboard flow

1. User signs in through Wix.
2. Admin guard calls `GET /api/admin/authorization`.
3. Vercel validates the Wix identity and checks supported Wix owner/admin permission or the private enabled staff record.
4. Only after authorization succeeds does the frontend render the protected admin view.
5. The dashboard calls `GET /api/admin/students`; Vercel independently repeats the authorization check on this request and fetches StudentProfiles from Wix CMS.
6. Bookings, service catalog, availability and Pricing Plans can continue to use existing supported Wix SDK calls where the Wix APIs enforce the current member's permissions. Protected student CMS records must use the server boundary.
7. Never rely on hiding the admin page in React as the security control; every API route enforces authorization independently.

## 8. Environment setup

Create local `.env.local` and configure equivalent variables in the Vercel project settings. Do not commit `.env.local`.

Expected server-side configuration (final names to be aligned with implementation):

- `WIX_SITE_ID` — existing Wix site ID.
- `WIX_CLIENT_ID` — existing Headless client ID, if required by the server-side Wix SDK client.
- `WIX_API_KEY` — server-only Wix API key with minimal CMS/member API permissions.
- `BSDA_ALLOWED_ORIGINS` — local test origin(s) and approved production origins.
- `VITE_BSDA_API_BASE_URL` — optional public API base URL; no secrets may use a `VITE_` prefix.

Use placeholder values in documentation only. Never commit real credentials. Rotate any credential accidentally exposed in Git history.

## 9. Implementation sequence

### Phase 0 — baseline and isolation
- Confirm branch head matches `test` before code changes.
- Keep this work exclusively on `vercel-backend-test`.
- Preserve the existing UI and existing working Wix Bookings/Plans integrations.
- Add Vercel local development tooling/configuration only after confirming the repo's current scripts and Vercel project settings.

### Phase 1 — API foundation
- Add server-only Wix API client/config validation.
- Add safe `/api/health` and common CORS/method/error helpers.
- Confirm local Vercel runtime starts alongside the existing Vite SPA and that the React routes still work.
- Fail at startup/request time with a clear safe configuration error when required environment variables are missing.

### Phase 2 — Wix identity validation
- Implement and test the supported Wix member-token validation path.
- Verify valid, expired, malformed, and missing tokens.
- Derive member identity only from Wix.
- Do not proceed to protected data routes until token validation is proven against the actual Wix site.

### Phase 3 — student profile provisioning and retrieval
- Implement `POST /api/student/profile` and `GET /api/student/profile`.
- Verify collection ID and field IDs in Wix.
- Test first creation, repeat call, concurrent/retry behavior, missing fields, and cross-member isolation.
- Update the existing provisioning/student service adapters to call the new API rather than the Velo invoke URLs.

### Phase 4 — admin authorization and directory
- Implement `GET /api/admin/authorization` and `GET /api/admin/students`.
- Prove owner/collaborator authorization through supported Wix APIs.
- Check approved staff records using member ID; disabled/unlisted staff must be denied.
- Update admin guard and student list service to use Vercel routes.
- Keep unrelated dashboard modules working through their existing supported Wix SDK APIs.

### Phase 5 — tests and verification
- Run `npm run build`.
- Run the app with Vercel's local runtime and exercise all routes.
- Test student, unauthorized ordinary member, approved staff, disabled staff, Wix owner/admin, and expired-token cases.
- Verify a student cannot read another student's record and a normal member cannot enumerate StudentProfiles.
- Verify public package/service/booking pages and existing UI are unchanged.
- Check logs and responses for secret/data leakage.
- Document any Wix plan/API-permission requirement or unsupported owner/collaborator check.

### Phase 6 — review only
- Summarize changed files, tests, known blockers, and required dashboard environment variables.
- Do not deploy production, change the production domain, or merge into `test` without explicit approval.

## 10. Acceptance criteria

- A Wix member can register/login using the existing UI.
- A corresponding StudentProfiles record is created once in Wix CMS.
- A student sees their own profile after login.
- Student A cannot access Student B's profile by changing request parameters.
- An ordinary member cannot view the admin dashboard's protected student directory.
- Only supported Wix owner/admin identities and explicitly enabled staff can access protected admin routes.
- Admin student data is read from Wix CMS through Vercel; no duplicate database is introduced.
- Public Wix-backed pages and the current design continue to work.
- Local build passes and production remains untouched.
