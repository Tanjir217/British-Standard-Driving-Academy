# BSDA Managed Video Content

The Home video, six Social Reels slots, and six Student Portal learning-video slots are controlled from **Admin → Content**.

## 1. Wix CMS collection

Create a Wix CMS collection with this exact ID: `SiteContent`

Recommended fields:

| Field ID | Type | Purpose |
|---|---|---|
| `key` | Text | Stable content slot key |
| `url` | Text | Video URL |
| `title` | Text | Admin/content label |
| `type` | Text | Currently `video` |
| `enabled` | Boolean | Whether the slot has active content |

The application uses these keys:
- `home-featured-video`
- `reel-1` through `reel-6`
- `portal-video-1` through `portal-video-6`

The API uses the key as the Wix item ID, so each slot is an upsert.

## 2. Wix permissions

Keep the collection protected:
- Read: `ANYONE`
- Insert: `ADMIN`
- Update: `ADMIN`
- Remove: `ADMIN`

The public website does not write directly to the collection. Content writes go through the server-side `/api/content` function.

## 3. Vercel environment variables

Add these to the Vercel project:

```text
WIX_API_KEY=your_server_side_wix_api_key
WIX_SITE_ID=your_wix_site_id
BSDA_ADMIN_EMAILS=admin@example.com,second-admin@example.com
```

The existing `wix.config.json` supplies the Wix client ID. You can optionally set:

```text
WIX_CLIENT_ID=your_wix_client_id
```

### Security

Do **not** prefix the Wix API key with `VITE_`. Vite exposes `VITE_` variables to browser code. Wix recommends keeping API keys only in server-side code. The `/api/content` endpoint validates the signed-in Wix member against `BSDA_ADMIN_EMAILS` before allowing writes.

## 4. Wix API key permissions

Create a Wix API key with only the site-level permissions needed for the CMS Data Items API. Wix's Data Items write operations require the **Write Data Items** permission scope, and queries require the corresponding read permission. Store the key only in Vercel/server environment variables.

## 5. How the admin workflow works

### Home video

Admin → Content → **Home Video**

Paste a YouTube URL such as `https://www.youtube.com/watch?v=VIDEO_ID` and save. The Home page loads that video.

### Social Reels

Admin → Content → **Social Reels**

Each slot is independent:
- Video Slot 01 → `reel-1`
- Video Slot 02 → `reel-2`
- ...
- Video Slot 06 → `reel-6`

Paste a YouTube, TikTok, Facebook or Instagram video URL and save.

### Student Portal

Admin → Content → **Student Portal**

Each saved URL becomes a learning video visible to signed-in students in the portal.

## 6. Current playback support

The frontend converts supported URLs into embeddable players:
- YouTube / YouTube Shorts / YouTube Live
- TikTok videos
- Instagram Reels/posts
- Facebook videos

Platform availability and embedding restrictions are controlled by each platform. If a platform does not allow a particular video to be embedded, the URL itself can still be stored, but the third-party player may refuse playback.

## 7. Local development

After pulling the branch, run:

```bash
npm install
npm run dev
```

The Wix SDK packages are included in `package.json` and `package-lock.json`.

For local admin content management, the same Wix/Vercel environment values need to be available to the serverless API runtime. Vercel production is the intended deployment environment for `api/content.ts`.