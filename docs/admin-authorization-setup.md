# BSDA Admin Authorization — Wix CLI setup

## Current implementation

The frontend is a React/Vite single-page app. Wix's managed Headless CLI supports deploying an existing client-only frontend and a separate server output built for the Cloudflare Workers runtime. This branch configures the existing Wix project to deploy both outputs:

- Client build: `./dist`
- Backend Worker: `./server`
- Health route: `GET /api/health`
- Admin route: `GET /api/admin-authorization`

The frontend uses `VITE_ADMIN_AUTHORIZATION_ENDPOINT` when set, otherwise it calls:

`https://www.bsda.online/api/admin-authorization`

The old `wix-site-backend/backend/http-functions.js` is a Velo Site HTTP Function implementation and is **not** used by this Wix CLI Worker. Do not expect `/_functions/adminAuthorization` to become available from that file.

## Important security behavior

The Worker:
1. Answers CORS preflight requests for localhost and the two BSDA production origins.
2. Sends the member access token to Wix's current-member REST endpoint to obtain the authenticated member ID.
3. Grants admin access only when that verified member ID appears in the server-side `BSDA_ADMIN_MEMBER_IDS` environment variable.
4. Fails closed if the token is invalid, the member is not allowlisted, or the allowlist is missing.

The allowlist must contain Wix **site-member IDs**, comma-separated. It is not an email list and not a Wix dashboard collaborator ID unless that same identity also has the matching site-member ID. Never move this allowlist into frontend code.

## Local CLI setup and deployment

Run these commands from the root of this repository in a terminal with Node.js 20.11.0+:

```bash
node --version
npx wix whoami
npm run build
npx wix release
```

- If `npx wix whoami` says you are not logged in, run `npx wix login` first.
- The release command publishes the already-built `dist` client and the Worker in `server`; it does not replace the React/Vite frontend with Astro.
- Do not delete `wix.config.json` or run `npm create @wix/new init` in this already-linked repository. The init command provisions a new Wix site and fails if `wix.config.json` already exists.
- This repository's code changes alone do not deploy anything. The authenticated CLI release must complete successfully.

## Configure the admin allowlist on Wix

After confirming the CLI is authenticated to the site identified by this repository's `wix.config.json`, set the variable on Wix's environment service:

```bash
npx wix env set --key=BSDA_ADMIN_MEMBER_IDS --value=YOUR_WIX_SITE_MEMBER_ID
npx wix env pull
npm run build
npx wix release
```

Replace `YOUR_WIX_SITE_MEMBER_ID` with the actual member ID. For multiple admins, use a comma-separated list. Do not paste passwords or API keys into the command. Verify the CLI target/site before running release because it publishes to the linked Wix project.

## Verify after release

1. Open `https://www.bsda.online/api/health`. Expected response: `{"ok":true,"service":"bsda-admin-api"}`.
2. Open `https://www.bsda.online/api/admin-authorization` without a token. Expected: HTTP 401, not 404.
3. Start the Vite app with `npm run dev`, sign in with a real Wix site-member account whose member ID is on the allowlist, and test the admin portal.
4. In DevTools Network, the `OPTIONS` request should return 204 and the authorized `GET` should return 200 with `{"authorized":true}`. A normal member not on the allowlist should receive 403.
5. Confirm the browser response has `Access-Control-Allow-Origin: http://localhost:5173` during local testing.

A successful `npm run build` verifies only the frontend build. Do not call the admin portal fixed until the CLI release succeeds and these live checks pass.

## OAuth redirect settings

The existing login code uses `/auth/callback`. Keep these authorization redirect URIs in the current Headless client:

- `http://localhost:5173/auth/callback`
- `https://www.bsda.online/auth/callback`
- `https://bsda.online/auth/callback`

Allowed redirect domains:

- `http://localhost:5173`
- `https://www.bsda.online`
- `https://bsda.online`

The API URL is **not** an OAuth redirect URI. Do not add `/api/admin-authorization` to the redirect URI list.

## Remaining verification

The source code has been committed to the working branch, but no authenticated Wix CLI release or live endpoint test has been performed from this environment. If `npx wix release` rejects the client/server output configuration, stop and share the exact CLI error rather than creating a second Wix site or changing the existing site IDs.
