# BSDA Vercel Backend Test — Architecture and Implementation Plan

## Scope and safety boundaries

- Repository: `Tanjir217/British-Standard-Driving-Academy`
- Working branch: `vercel-backend-test`
- Base branch: `test`
- Purpose: test a small server-side API for Wix member identity checks, authorization, and secure Wix CMS access.
- Keep the existing React/Vite UI and Wix member login.
- Keep Wix CMS as the source of truth for student profiles, staff permissions, packages, and site content.
- Do not merge into `test` or deploy to production as part of this work.
- Do not change production domain settings or production Wix data.
- Never put Wix privileged API credentials in client-side code or variables prefixed with `VITE_`.

## Proposed architecture

1. **React/Vite frontend** — keeps the existing pages, components, routes, and Wix OAuth/member sign-in.
2. **Vercel Functions** — a small server-side API in the repository's root `api/` directory. Functions validate the incoming Wix member credential, derive the member identity from trusted Wix responses, enforce access rules, and call Wix APIs.
3. **Wix CMS** — remains the authoritative data store. No new database is introduced.
4. **Wix API credentials** — privileged credentials are stored only as server-side Vercel environment variables and used only by API functions for operations that require elevated permissions.

### Request flows

- **Public content:** React requests public packages/content from Wix directly when the existing supported Wix API and collection permissions permit it. If a public endpoint is needed, it must return only explicitly public fields.
- **Student profile:** React sends the current Wix member access credential to the Vercel API. The server validates it through a supported Wix identity/API operation, obtains the canonical member ID from Wix (not from a client-supplied member ID), then reads or creates only that member's `StudentProfiles` record.
- **Admin dashboard:** React calls Vercel endpoints. The server validates the member and independently checks their permission against the protected `AdminStaffAccess` collection before returning or changing student data.
- **Wix CMS access:** all privileged CMS operations happen server-side. The browser must never receive the Wix API key or a privileged CMS response beyond the data the caller is authorized to see.

## Proposed API surface

These are planned routes, not implemented or deployed yet.

| Route | Purpose | Access |
| --- | --- | --- |
| `GET /api/health` | Basic API availability check; no secrets or personal data | Public |
| `GET /api/student/profile` | Return the authenticated member's own profile | Authenticated Wix member |
| `POST /api/student/profile` | Create the member's profile if it does not exist; make retries idempotent | Authenticated Wix member |
| `GET /api/admin/authorization` | Return whether the authenticated member has admin access and a minimal role description | Authenticated member; deny by default |
| `GET /api/admin/students` | List student records with pagination and limited fields | Authorized admin only |
| `GET /api/public/packages` | Optional server-mediated public package data if direct Wix access is unsuitable | Public; public fields only |

Route names can be adjusted to match the existing service conventions after inspecting the current frontend call sites.

## Authentication and authorization requirements

- Keep Wix as the member identity provider.
- Do not treat a client-supplied email, member ID, role, or `isAdmin` flag as proof of identity or permission.
- Do not trust an access token merely because it can be decoded. Validate it with a supported Wix server-side API/SDK flow before using its identity.
- Fail closed if token validation, permission lookup, or Wix CMS access fails.
- Derive the canonical member ID from the validated Wix identity.
- Student endpoints must scope reads/writes to that canonical member ID.
- Admin endpoints must check protected staff-access data on every request; hiding the dashboard UI is not authorization.
- Use least-privilege API key permissions where Wix supports them.
- Add input validation, bounded pagination, safe error responses, and request logging that excludes tokens and personal data.
- Add rate limiting or abuse controls appropriate to the chosen hosting/runtime before production.

### Admin identity policy to preserve

The existing project requirement is to allow the Wix site owner, Wix collaborators with administrative permissions, and explicitly selected staff, while denying ordinary members. A Vercel function cannot infer a Wix collaborator's dashboard permissions from an ordinary website-member session by assumption. Before implementing this policy, verify a supported way to identify each permitted administrator. Do not silently replace the policy with an email allowlist or a browser-controlled role. If Wix owner/collaborator identities cannot be verified in this headless setup, use an explicit, auditable server-side staff authorization mechanism approved by the site owner.

## Wix CMS collections

Use the existing collections rather than creating a parallel database:

- `StudentProfiles` — profile fields, joined date, status, lesson counts, and member association.
- `AdminStaffAccess` — explicit staff access records and roles.

Before implementing writes, verify the actual collection IDs and field IDs in Wix CMS. Display labels such as “Member ID” do not necessarily equal the API field key. Avoid duplicate student records by querying with the validated member ID before inserting. Do not overwrite admin-managed fields during automatic profile provisioning.

## Environment setup

Template: `.env.example`

- `VITE_WIX_CLIENT_ID`: public Wix Headless client ID used by the frontend; not a secret.
- `WIX_SITE_ID`: server-side Wix site identifier.
- `WIX_API_KEY`: privileged Wix API key; server-only, never exposed to Vite.
- `BSDA_ALLOWED_ORIGIN`: allowed browser origin for CORS (local development defaults to `http://localhost:5173`).

Set real values in local `.env.local` and Vercel Project Settings. Do not commit `.env.local`, API keys, access tokens, or other secrets. The exact Wix API key permissions and identity-validation mechanism must be confirmed against the Wix APIs available to this site before enabling CMS writes.

## Implementation phases

1. **Environment and baseline**
   - Confirm branch and baseline build.
   - Add the server environment template and a non-sensitive health endpoint.
   - Keep all real secrets out of Git.
2. **Wix identity validation**
   - Inspect the existing Wix OAuth/token service and use the supported server-side verification method.
   - Add shared request parsing, origin/CORS handling, and safe error handling.
   - Test valid, expired, missing, and malformed credentials.
3. **Student profile provisioning**
   - Implement authenticated GET and idempotent POST.
   - Validate collection/field IDs.
   - Test duplicate registration, retries, missing CMS permissions, and cross-member access denial.
4. **Admin authorization and data**
   - Implement authorization checks backed by protected staff-access records.
   - Resolve the supported verification of owner/collaborator access before granting it.
   - Add paginated admin student reads and deny ordinary members.
5. **Frontend integration**
   - Replace the broken Velo HTTP function calls only where the new API is ready.
   - Keep visual design and Wix login flow unchanged.
   - Keep public content on direct Wix APIs where appropriate.
6. **Testing**
   - Run TypeScript/build checks.
   - Test locally, then use a Vercel preview deployment tied to this branch only if explicitly approved.
   - Verify student, ordinary-member, staff, unauthorized, and failure paths.
   - Do not merge or deploy production without explicit approval.

## Acceptance criteria

- Existing frontend design and Wix login remain unchanged.
- Student registration creates at most one Wix CMS profile per member.
- A student can read only their own profile.
- Ordinary members cannot access admin endpoints.
- Admin access is verified server-side on every protected request.
- Wix privileged credentials never appear in browser bundles, API responses, or committed files.
- Failures are visible in safe diagnostic logs without leaking tokens or personal information.
- Production is untouched until a separate explicit approval.
