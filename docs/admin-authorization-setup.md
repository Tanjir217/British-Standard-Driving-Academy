# BSDA Admin Authorization — Wix setup

## What the browser network log showed

The frontend previously called `https://www.wixapis.com/velo/v1/http/invoke/adminAuthorization`. In the reported Network log, that request returned **404**. For a Wix Site HTTP Function named `get_adminAuthorization`, the site endpoint format is:

`https://www.bsda.online/_functions/adminAuthorization`

The frontend service now targets that URL. A 404 from this URL means the function is not deployed/published at that site URL, the domain does not point to the Wix site hosting the function, or the function name does not match. A URL change alone cannot create or deploy the function.

The same log showed the Wix `login` request returning **401**. That is a separate member-authentication failure, not a redirect URL error. Use a valid Wix **site-member** email/password (the Wix dashboard/collaborator login is not automatically a site-member account). If necessary, reset the site-member password.

## OAuth redirect URLs

The frontend's current code uses `/auth/callback`, so the exact authorization redirect URIs to allow in the Headless client are:

- `http://localhost:5173/auth/callback`
- `https://www.bsda.online/auth/callback`
- `https://bsda.online/auth/callback`

Allowed redirect domains should include:

- `http://localhost:5173`
- `https://www.bsda.online`
- `https://bsda.online`

Add only the production domain(s) you actually use. Keep any other existing entries only if another active frontend flow still depends on them. Do not put `/auth/callback` into the Login URL field; it is an authorization redirect URI, not the custom login-page URL.

## Backend deployment requirement

The backend source in `wix-site-backend/backend/http-functions.js` is only a repository file until installed in a Wix site backend and published. It is not deployed by `npm run build`, and it is not a Vercel function.

The current Wix dashboard access described by the project owner does not expose a Velo/site code editor. Therefore, do not claim the endpoint is live until a supported Wix backend deployment path has been established and the published endpoint returns the expected response. Wix documentation distinguishes site HTTP functions (`/_functions/`) from Wix-managed Headless HTTP endpoints; the endpoint type must match the actual Wix project development path.

## Required authorization behavior

Create a CMS collection with collection ID **`AdminStaffAccess`**, permissions set to **Admin only**, with:
- `memberId` — Text; exact Wix site-member ID, not an email.
- `enabled` — Boolean.

Only an authenticated member with a Wix admin role or an enabled allowlist entry may receive `{ "authorized": true }`. Ordinary members and signed-out visitors must be denied. Never authorize based only on an email, a browser marker, or a frontend role flag.

## Security

- Never put API keys, client secrets, or admin tokens in frontend code or `.env.local`.
- Keep student profiles and lesson records protected by Wix permissions/backend authorization, not merely hidden routes.
- The current frontend fails closed if the endpoint is unavailable or returns an invalid/non-success response.
