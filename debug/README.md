# VideoLibrary CMS browser diagnostic

This folder documents the temporary read-only CMS access test.

## Run the test

1. Check out `refactor/codebase-cleanup`.
2. Install dependencies using the project's existing package manager and lockfile.
3. Start the project's supported Wix development workflow.
4. Open `/debug/video-library` on the local development site.
5. Read the page status and response payload. Also inspect the browser Network and Console panels.
6. If it fails, verify the collection's actual **collection ID** (not only its display name) and its Wix CMS read permissions before changing code.

## What it tests

The page imports the existing `src/services/wix/client.ts` client and calls:

```ts
wixClient.items.query("VideoLibrary").limit(5).find()
```

This is read-only and requests at most five items. It does not insert, update, or delete CMS records. A successful request demonstrates that this browser client can query the specified collection under the current Wix configuration and permissions. It does not, by itself, prove that every public visitor can read it or that the collection is configured securely.

## Important

- Confirm the collection ID in Wix CMS. Wix display names and API collection IDs can differ.
- Do not use this diagnostic against private student records.
- Do not add tokens, API secrets, or personal data to debug output.
- This is a temporary developer route; remove it after testing.
