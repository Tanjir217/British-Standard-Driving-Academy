# BSDA — Tomorrow's Bug & Fix TODO

## Blocked / requires client access

- [ ] Add and configure the required Wix server environment variables once the client provides/approves the credentials:
  - WIX_CLIENT_ID
  - WIX_API_KEY (server-only)
  - WIX_SITE_ID
  - BSDA_ADMIN_EMAILS
- [ ] Verify the Wix `SiteContent` collection exists with the expected permissions/schema.
- [ ] Verify the deployed `/api/content` serverless route works on the actual hosting environment.
- [ ] Decide whether to keep the API-key approach or migrate the server-side Wix access to OAuth client credentials.

## Admin/security

- [ ] Restore the proper admin authentication gate after the admin login flow is completed.
- [ ] Remove the temporary `/admin` login bypass in `src/App.tsx`.
- [ ] Test unauthorized admin access and direct API write attempts.
- [ ] Confirm no Wix API key/client secret is exposed through Vite client-side variables.

## Content management

- [ ] Test Home featured video save/load.
- [ ] Test all 6 social reel slots.
- [ ] Test all 6 Student Portal video slots.
- [ ] Test remove/disable behavior for content slots.
- [ ] Verify supported YouTube/TikTok/Instagram/Facebook URL formats in production.

## Contact form

- [ ] Configure the production contact email/environment value.
- [ ] Test Wix `ContactEnquiries` insertion from the deployed site.
- [ ] Confirm the requested Excel Online workflow; direct Excel append is not implemented yet and requires an approved integration/webhook/backend credential.

## Build / regression checks

- [ ] Run `npm install` and `npm run build` on the merged `test` branch.
- [ ] Fix all TypeScript/build errors.
- [ ] Test Home, Booking, Packages, Lessons, Portal, Contact, Join Our Team, Login and Admin routes.
- [ ] Check browser console for runtime errors.
- [ ] Check responsive layouts on desktop/tablet/mobile.
- [ ] Verify existing test-branch changes were not lost during the merge.

## Important current state

- Admin login code was intentionally kept but temporarily bypassed.
- Wix API credentials were not added because client verification/access is currently unavailable.
- Main branch was not modified.
