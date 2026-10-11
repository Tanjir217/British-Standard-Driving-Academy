# Student Profile Provisioning (Wix backend)

The learning portal's signup creates a Wix Site Member. It must also create one
matching item in the Admin-only **Student Profiles** CMS collection.

## Architecture

1. The React app completes Wix member authentication.
2. It sends the member access token to
   `https://www.bsda.online/_functions/createStudentProfile`.
3. The Wix HTTP function resolves the authenticated member from Wix's
   authentication context. It does not trust a member ID or personal details
   submitted by the browser.
4. Wix backend code checks for an existing item by `memberId`; if none exists,
   it inserts a profile. Repeated logins therefore do not create duplicates.

No Vercel API or browser-side privileged CMS access is used.

## Required Wix setup before publishing

The backend function is in `wix-site-backend/backend/http-functions.js`, but
GitHub does not automatically install that file into the Wix site's Velo
backend. Merge/publish the corresponding code in the Wix site backend first.

Before deploying, confirm the **collection ID** and each **field key** in Wix
CMS. The code currently assumes:

- Collection ID: `StudentProfiles`
- `memberId`, `fullName`, `email`, `phone`, `transmission`,
  `lessonsCompleted`, `status`, `joinedDate`
- Primary title field: `title`

These are field keys, not the human-readable labels. If Wix shows different
keys, update the constants/mapping in the backend function to match them.
The CMS collection should remain Admin-only; backend code uses
`suppressAuth: true` only after resolving the caller's Wix member identity.

The endpoint is served by Wix at `/_functions/createStudentProfile`. Publish
the Wix site after installing the backend function. Then test a new signup and
verify that one Student Profiles item appears with the same Wix Member ID.
