# BSDA Admin Authorization — Wix setup

## Why the previous check was unsafe

The frontend previously treated a successful call to Wix Extended Bookings as proof of administrator access. That is not an explicit role or staff allowlist check. A sessionStorage marker is browser-controlled and is only a UX hint, not an authorization control.

The React gate calls Wix's authenticated HTTP Functions REST endpoint at `https://www.wixapis.com/velo/v1/http/invoke/adminAuthorization` using the signed-in member access token. This is the documented Wix REST route; calling `https://www.bsda.online/_functions/adminAuthorization` directly would hit the custom-domain frontend host and does not carry Wix member authentication context. The frontend **fails closed** on a missing endpoint, non-2xx response, invalid response, or network error.

## Required Wix site backend setup

This endpoint must be installed in the **existing Wix site's Velo backend**. It is not a Vercel function and it is not deployed by the React/Vite build.

1. Open the existing BSDA site in Wix and enable Dev Mode / Velo.
2. Create `backend/http-functions.js` in the Wix site code editor and copy the contents of `wix-site-backend/backend/http-functions.js` into it.
3. Create a CMS collection with collection ID **`AdminStaffAccess`**. Set collection permissions to **Admin only**. Add fields:
   - `memberId` — Text; Wix site's member ID, not email.
   - `enabled` — Boolean.
   Add one item per explicitly approved staff member, with the exact Wix member ID and `enabled = true`. Set `enabled = false` or remove the item to revoke access.
4. Publish the Wix site backend changes. The endpoint must be available at `https://www.bsda.online/_functions/adminAuthorization` (or the canonical domain you use).
5. In the frontend's `.env.local`, set `VITE_WIX_SITE_ORIGIN=https://www.bsda.online` if your canonical Wix site origin differs from the default. This value is public configuration, **not a secret**.
6. Test with three identities:
   - Site owner / collaborator with Wix admin permissions: should receive `authorized: true`.
   - Enabled staff member: should receive `authorized: true`.
   - Ordinary member and signed-out visitor: must be denied.
7. Run `npm run build` and test the flow on localhost and the published site.

## Important security notes

- Never store passwords, API keys, client secrets, access tokens, or refresh tokens in frontend environment variables.
- Do not rely on frontend route hiding as the only protection. Keep Wix CMS collections containing student profiles and lesson records Admin-only; keep all write operations protected by Wix permissions or backend authorization.
- The endpoint uses the authenticated Wix request context supplied by the Wix HTTP Functions API. Do not accept an email or member ID from query parameters as proof of identity. The endpoint deliberately does not use CORS origin checks as authorization; the member identity and allowlist are the access controls.
- This repository contains the Velo backend source as a handoff file. It must be copied into the existing Wix site's Velo code editor and published there; the current Vite project does not automatically deploy Velo site code.
