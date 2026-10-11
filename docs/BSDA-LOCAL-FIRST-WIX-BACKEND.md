# BSDA local-first Wix backend workflow

## Project constraints

- Repository: `Tanjir217/British-Standard-Driving-Academy`
- Working branch for this fix: `fix/student-profile-wix-backend`
- Integration branch: `test`
- Production frontend: `https://bsda.online`
- Local frontend: `http://localhost:5173`
- Wix site editor access is unavailable for this project. Do not make the Wix Editor a prerequisite or ask the project owner to open it.
- Keep the React/Vite frontend design unchanged.
- Student profile and admin authorization data must be accessed through Wix-hosted backend functions. Do not add Vercel API routes or browser-side privileged CMS access.

## Wix backend source of truth

For the Wix Sites / Git Integration source layout, the canonical HTTP Functions entrypoint in this repository is:

`src/backend/http-functions.js`

`wix-site-backend/backend/http-functions.js` is kept as a mirrored copy for the project's existing backend source organization. Keep both copies synchronized when changing these functions.

The HTTP Functions use the existing Wix CMS collection IDs:
- `StudentProfiles`
- `AdminStaffAccess`

The current student endpoint resolves the caller using Wix's authenticated member context and returns only the profile whose `memberId` matches that identity. Never accept a member ID from the browser as the authorization source.

## Endpoints

- `POST createStudentProfile`: create the signed-in member's profile if missing; idempotent for an existing profile.
- `GET currentStudentProfile`: return only the signed-in member's own profile.
- `GET studentProfiles`: list profiles only for Wix admins or explicitly enabled staff.
- `GET adminAuthorization`: authorize Wix admins and explicitly enabled staff.

The allowed browser origins include `https://bsda.online`, `https://www.bsda.online`, and `http://localhost:5173`. Test the production and local origin separately.

## Deployment and verification rule

A GitHub push is a source-code update; it is not proof that Wix has deployed the backend functions. After the change is merged into the Wix-connected branch, deploy/publish using the existing supported Wix CLI / Git Integration workflow for this site. Verify the deployed function by invoking it with a signed-in member token and checking the HTTP response. Do not claim the Wix-hosted endpoint is fixed until that live check succeeds.

## Student profile acceptance checks

1. Build the React/Vite app with `npm run build`.
2. Register or sign in at `http://localhost:5173`; confirm the provisioning request to `createStudentProfile` no longer returns 404.
3. Confirm `currentStudentProfile` returns the signed-in member's own profile and the portal renders it.
4. Repeat at `https://bsda.online`.
5. Verify an unauthenticated request cannot read a profile and one member cannot read another member's profile.
6. Verify admin profile listing remains protected by the backend authorization check.

If the Wix deployment cannot be triggered or verified from the connected Git workflow, report that limitation explicitly; do not substitute a Vercel backend or claim a deployment happened.
