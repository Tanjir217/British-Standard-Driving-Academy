# BSDA read-only CMS diagnostics

## PromotionalBanners collection diagnostic

A temporary local-only API diagnostic has been added at:

- API route source: `src/pages/api/debug/promotional-banners.ts`
- Local URL: `/api/debug/promotional-banners`
- Target collection ID: `PromotionalBanners`

### Run

1. Check out `feat/wix-managed-booking-checkout`.
2. Run `npm install` if dependencies are not installed.
3. Start the configured Wix development workflow with `npm run dev`.
4. Open `http://localhost:4321/api/debug/promotional-banners` (use the port shown by the dev server if different).
5. Review the JSON response and local dev-server terminal.

The route uses the existing Wix SDK integration and performs a read-only query for up to 20 records. It reports the collection ID, returned record values for the expected banner fields, and field IDs found in returned records. It does not create, update, or delete data.

**Important:** The route intentionally returns 404 outside development mode. Do not remove that guard or deploy this diagnostic as a public production endpoint. If the collection has no records, the query cannot infer the full field schema; confirm field IDs in Wix CMS > Promotional Banners > Manage Fields.

The returned records are limited to these fields: `_id`, `_createdDate`, `_updatedDate`, `title`, `image`, `imageUrl`, `altText`, `linkUrl`, `enabled`, and `sortOrder`.

## Existing VideoLibrary CMS browser diagnostic

The homepage's existing video diagnostic is available at `/debug/video-library`. It uses `src/services/wix/client.ts` and queries `VideoLibrary` through the current browser/member-context client.

## Safety notes

- Never add API keys, access tokens, or secrets to diagnostic output.
- Do not use promotional-content diagnostics to inspect student or other private records.
- Remove temporary diagnostic code after verification is complete.
