# BSDA Student Portal Implementation Plan

## Working branch
- Base: `feat/wix-managed-booking-checkout`
- Implementation branch: `feat/student-portal-full-data`
- Repository: `Tanjir217/British-Standard-Driving-Academy`

## Non-negotiable rules
- Keep all changes on this branch; do not merge or deploy.
- Never trust a browser-supplied member ID/contact ID to authorize a CMS read.
- Authenticate each protected request with Wix on the server.
- Use `Members/FullData` as the source of truth for the existing student identity/profile record.
- Match FullData by the authenticated Wix member's `contactId` first. Email is only a documented fallback if the authenticated Wix member response does not expose contactId and the current data contract explicitly permits it.
- Do not fabricate lesson counts, progress, package assignments, instructors, bookings, or learning content.
- Distinguish missing data from a legitimate zero.
- After each implementation step, fetch the changed files back from GitHub and inspect them before continuing.
- Run build/type checks where an executable local checkout is available. A GitHub-only edit does not count as a passed build.

## Step-by-step implementation

### Step 1 — Baseline and branch — COMPLETE
- Created `feat/student-portal-full-data` from `feat/wix-managed-booking-checkout`.
- Inspected profile, authentication, lessons, bookings, packages, content management, and current CMS endpoint patterns.
- Added this plan and verified it by fetching it back from GitHub.

### Step 2 — FullData profile contract and secure reads — IMPLEMENTED; runtime verification pending
- Keep profile reads in the server API, never directly in browser code.
- Validate the Wix member access token server-side.
- Resolve the matching FullData record by contactId, detect duplicates, and return only approved profile fields.
- Remove unsafe/default values that imply real data (for example, fake zero progress or an invented transmission preference).
- Preserve status/approval gates only when supported by the actual configured FullData fields.
- Verify endpoint behavior for unauthenticated, missing, duplicate, inactive, and successful matches.

### Step 3 — Student portal profile UI — IMPLEMENTED; browser verification pending
- Remove the temporary raw FullData debug panel from the normal portal UI.
- Display FullData identity, contact, photo, account status, and timestamps where present.
- Add explicit loading, missing-profile, incomplete-data, and API-error states.
- Keep booking and lesson statistics unavailable until backed by verified data.
- Verify responsive and accessibility-friendly markup.

### Step 4 — Lesson Records backend adapter — IMPLEMENTED; Wix field/permission verification pending
- Add a server-side, authenticated endpoint for the signed-in student's lesson records.
- Use a configurable Wix CMS collection ID, defaulting to the agreed Lessons Records collection.
- Restrict the query to the authenticated student's verified FullData contactId/approved identifier.
- Return a minimal, validated record shape; never return other students' records.
- Replace the placeholder lesson service with calls to the protected endpoint.
- Do not infer completion from bookings or create lesson records from the frontend.
- Verify missing configuration, authorization, query failure, and empty result behavior.

### Step 5 — Booking history integration — IMPLEMENTED; Wix query/permission verification pending
- Inspect supported Wix Bookings APIs already installed in this repository.
- Implement only queries whose API contract and authenticated ownership filter can be verified.
- Show upcoming and past bookings with real service, time, status, and staff data.
- If the Wix API does not support a safe authenticated current-member query with the current integration, document the precise Wix-side configuration or server API work still required rather than guessing an endpoint.

### Step 6 — Package, instructor, and learning material data — PARTIALLY IMPLEMENTED
- Reuse the existing Wix Pricing Plans and staff services where appropriate.
- Resolve a student's package only from a verified order/enrollment association.
- Resolve instructor assignments only from a real booking or explicit assignment record.
- Connect learning materials only to an existing verified source; otherwise show an honest empty state.
- Do not present a public pricing plan as proof that the student purchased it.

### Step 7 — Progress calculations — BLOCKED ON AUTHORITATIVE ENTITLEMENT/STATUS DATA
- Define completed-lesson statuses from actual lesson records.
- Derive completed lessons from verified completed records.
- Derive remaining lessons only when package entitlement/lesson quantity is known from a verified enrollment.
- Calculate progress only when numerator and denominator are known; otherwise represent it as unavailable.
- Verify edge cases such as zero entitlement, cancelled bookings, no-shows, duplicate lesson rows, and missing dates.

### Step 8 — Profile updates and source of truth — READ-ONLY FULLDATA CONTRACT IMPLEMENTED
- Audit current POST/PATCH writes to `StudentProfiles`.
- Do not write profile edits to a collection that the GET endpoint does not read.
- Keep FullData read-only unless a supported and approved write contract is established.
- If editable personal fields are required, implement a separate private student-owned profile record with clear field ownership, and merge it predictably with FullData without overwriting authoritative CMS fields.
- Verify ownership checks and input validation.

### Step 9 — Final audit and verification — CODE AUDIT COMPLETE; runtime verification pending
- Re-fetch every changed file and inspect the complete diff.
- Search for remaining hardcoded/mock dashboard values and placeholder copy.
- Run `npm run check` and `npm run build` if a local checkout/runtime is available; record exact results.
- Verify no secrets, public privileged CMS calls, unsafe identifiers, or accidental collection writes were introduced.
- Provide a final report separating completed code work, Wix dashboard tasks, unverified external dependencies, and exact tests run.

## Expected Wix-side items to confirm
- Exact FullData collection ID and actual field IDs/types (not just display labels).
- `Members/FullData` is the existing profile source; known field IDs include `contactId`, `loginEmail`, `firstName`, `lastName`, `phone`, `nickname`, `profilePhoto`, `coverPhoto`, `activityStatus`, and `status`.
- `LessonRecords` is the collection ID used by the existing admin API. The student endpoint defaults to field ID `studentId`, which must contain the matching FullData `contactId`. If the actual field ID differs, set `BSDA_LESSON_STUDENT_ID_FIELD` to the exact Wix field ID.
- Optional server environment overrides: `BSDA_FULLDATA_COLLECTION_ID`, `BSDA_LESSON_RECORDS_COLLECTION_ID`, and `BSDA_LESSON_STUDENT_ID_FIELD`.
- CMS permissions remain private/admin-only for protected collections; server-side elevated reads must remain ownership-filtered.
- Wix Bookings needs the app's required booking-read permission scopes and a queryable `contactDetails.contactId` value on bookings.
- Wix Pricing Plans member-order listing requires a logged-in member and a published Wix site; verify the installed SDK and Wix runtime expose the current-member order call.
- The existing managed video source is `SiteContent`, with enabled keys `portal-video-1` through `portal-video-6`.
- Lesson progress still requires an agreed completion definition and authoritative package entitlement quantity; do not infer remaining lessons from plan labels or public plans.

## Completion criteria
- FullData profile is loaded from Wix server-side for the authenticated member.
- Student portal no longer displays fabricated stats or placeholder copy as if it were live data.
- Lesson data endpoint and service are connected with ownership filtering.
- Bookings/packages/instructor/material sections either show verified backend data or a clear, honest unavailable/empty state.
- All feasible code changes are committed to this branch and re-inspected.
- Any work that cannot safely be implemented from repository evidence is listed explicitly for Wix-side setup or additional schema details.


## Implementation results (2026-10-16)

### Code completed on this branch
- Protected GET profile API now prefers the Wix Astro managed member session, falls back to a validated Headless OAuth bearer token, resolves `Members/FullData`, matches contactId first, and uses email fallback only when Wix did not return contactId.
- Profile mapping no longer fabricates `transmission: "either"`, lesson counts, remaining entitlement, or progress percentages when those fields are absent in FullData.
- Removed the temporary raw FullData debug panel from the student portal.
- Student portal now requests and displays profile, lesson records, booking records, current-member pricing plan orders, and the six managed `portal-video-N` content slots.
- Added protected `GET /api/students/lessons` using `LessonRecords` and configurable student field ID (`studentId` by default).
- Added protected `GET /api/students/bookings`, filtered by Wix's supported `contactDetails.contactId` query field and rechecked against the authenticated FullData contactId.
- Added protected `GET /api/students/enrollment` using the current-member Pricing Plans order API.
- Removed unused student-profile POST/PATCH writes to the competing `StudentProfiles` collection from this branch; FullData is currently read-only and authoritative for identity/profile fields.
- Added responsive CSS for profile photos, lesson history, and learning videos.

### Not fully verifiable from repository edits alone
- The exact field ID `studentId` in `LessonRecords` must contain the student's FullData `contactId` as intended by the project data contract.
- Wix Bookings and Pricing Plans calls must be exercised against the connected Wix site with the current app/site permissions.
- The current Wix order object may not include a display-ready plan name in every response; verify returned order fields in the local response.
- Assigned instructor display depends on booking records containing a resource name.
- Progress and remaining lesson count remain unavailable until lesson completion semantics and package entitlement quantities are authoritatively defined.
- The learning-video slots use the existing `SiteContent` CMS and `/api/content` endpoint; verify the collection is readable and the six `portal-video-N` keys are enabled as desired.
- Re-fetched and inspected every changed source/document file after implementation; checked that the portal's raw diagnostic panel, obsolete placeholder copy, FullData fake progress values, and profile POST/PATCH writes are absent.
- The latest GitHub commit status reports the Vercel check as pending. No successful build/typecheck result is available yet; this session does not have the local project runtime needed to run `npm run check` or `npm run build`.
