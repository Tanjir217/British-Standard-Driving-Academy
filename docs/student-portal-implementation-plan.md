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

### Step 1 — Baseline and branch
- Create this branch from the current `feat/wix-managed-booking-checkout` head.
- Record the current profile, authentication, lesson, booking, package, and learning-material architecture.
- Keep a running list of code work vs. Wix dashboard/data work.
- Verify branch and baseline files.

### Step 2 — FullData profile contract and secure reads
- Keep profile reads in the server API, never directly in browser code.
- Validate the Wix member access token server-side.
- Resolve the matching FullData record by contactId, detect duplicates, and return only approved profile fields.
- Remove unsafe/default values that imply real data (for example, fake zero progress or an invented transmission preference).
- Preserve status/approval gates only when supported by the actual configured FullData fields.
- Verify endpoint behavior for unauthenticated, missing, duplicate, inactive, and successful matches.

### Step 3 — Student portal profile UI
- Remove the temporary raw FullData debug panel from the normal portal UI.
- Display FullData identity, contact, photo, account status, and timestamps where present.
- Add explicit loading, missing-profile, incomplete-data, and API-error states.
- Keep booking and lesson statistics unavailable until backed by verified data.
- Verify responsive and accessibility-friendly markup.

### Step 4 — Lesson Records backend adapter
- Add a server-side, authenticated endpoint for the signed-in student's lesson records.
- Use a configurable Wix CMS collection ID, defaulting to the agreed Lessons Records collection.
- Restrict the query to the authenticated student's verified FullData contactId/approved identifier.
- Return a minimal, validated record shape; never return other students' records.
- Replace the placeholder lesson service with calls to the protected endpoint.
- Do not infer completion from bookings or create lesson records from the frontend.
- Verify missing configuration, authorization, query failure, and empty result behavior.

### Step 5 — Booking history integration
- Inspect supported Wix Bookings APIs already installed in this repository.
- Implement only queries whose API contract and authenticated ownership filter can be verified.
- Show upcoming and past bookings with real service, time, status, and staff data.
- If the Wix API does not support a safe authenticated current-member query with the current integration, document the precise Wix-side configuration or server API work still required rather than guessing an endpoint.

### Step 6 — Package, instructor, and learning material data
- Reuse the existing Wix Pricing Plans and staff services where appropriate.
- Resolve a student's package only from a verified order/enrollment association.
- Resolve instructor assignments only from a real booking or explicit assignment record.
- Connect learning materials only to an existing verified source; otherwise show an honest empty state.
- Do not present a public pricing plan as proof that the student purchased it.

### Step 7 — Progress calculations
- Define completed-lesson statuses from actual lesson records.
- Derive completed lessons from verified completed records.
- Derive remaining lessons only when package entitlement/lesson quantity is known from a verified enrollment.
- Calculate progress only when numerator and denominator are known; otherwise represent it as unavailable.
- Verify edge cases such as zero entitlement, cancelled bookings, no-shows, duplicate lesson rows, and missing dates.

### Step 8 — Profile updates and source of truth
- Audit current POST/PATCH writes to `StudentProfiles`.
- Do not write profile edits to a collection that the GET endpoint does not read.
- Keep FullData read-only unless a supported and approved write contract is established.
- If editable personal fields are required, implement a separate private student-owned profile record with clear field ownership, and merge it predictably with FullData without overwriting authoritative CMS fields.
- Verify ownership checks and input validation.

### Step 9 — Final audit and verification
- Re-fetch every changed file and inspect the complete diff.
- Search for remaining hardcoded/mock dashboard values and placeholder copy.
- Run `npm run check` and `npm run build` if a local checkout/runtime is available; record exact results.
- Verify no secrets, public privileged CMS calls, unsafe identifiers, or accidental collection writes were introduced.
- Provide a final report separating completed code work, Wix dashboard tasks, unverified external dependencies, and exact tests run.

## Expected Wix-side items to confirm
- Exact FullData collection ID and actual field IDs/types (not just display labels).
- Exact Lessons Records collection ID and field IDs for student identity, booking ID, status, timestamps, and instructor feedback.
- CMS permissions remain private/admin-only for protected collections; server-side elevated reads must remain ownership-filtered.
- Existing Wix Bookings setup must associate bookings with the signed-in member/contact. Staff/customer identity must not be inferred from email alone.
- If package entitlement is not stored in an existing order/enrollment record, decide where that authoritative relationship will live.
- Identify the existing learning-material collection/source if one is intended for students.

## Completion criteria
- FullData profile is loaded from Wix server-side for the authenticated member.
- Student portal no longer displays fabricated stats or placeholder copy as if it were live data.
- Lesson data endpoint and service are connected with ownership filtering.
- Bookings/packages/instructor/material sections either show verified backend data or a clear, honest unavailable/empty state.
- All feasible code changes are committed to this branch and re-inspected.
- Any work that cannot safely be implemented from repository evidence is listed explicitly for Wix-side setup or additional schema details.
