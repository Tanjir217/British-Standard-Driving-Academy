# British Standard Driving Academy (BSDA)

BSDA is the existing multi-page driving academy application. The `main` branch remains the recovery baseline; the `astro-wix-backend-foundation` branch introduces a controlled migration to Astro + React with Wix-managed Headless capabilities.

## Architecture

- Astro with the official Wix Astro integration (dependency versions must match the published Wix package peer requirements), Wix page registry, and Wix fetch adapter.
- React 18.3.1 + TypeScript + React Router (required by the pinned Wix Astro integration) for the existing interactive page experience.
- Wix Members for identity, Wix CMS for academy-specific student/lesson data, Wix Bookings for live services/availability/bookings, and Wix Pricing Plans for commercial plans.
- Protected server endpoints under `src/pages/api/`; private CMS operations are not performed directly by browser code.
- Existing navy, red, cream, and white design system and current React page components remain the presentation source of truth.

## Existing routes

- `/` — Home
- `/booking` — Booking
- `/packages` — Packages and pricing
- `/lessons` — Driving lessons
- `/instructors` and `/instructors/:instructorId` — Instructor directory/details
- `/portal` — Student portal
- `/login` and `/auth/callback` — Legacy login flow retained during migration
- `/faq` — FAQ
- `/admin` — Protected staff dashboard

## Development commands

Install dependencies:

```bash
npm install
```

Wix CLI development (requires the supported project binding and an authenticated Wix CLI session):

```bash
npm run dev
npm run check
npm run build
npm run preview
```

Astro-only local diagnostics:

```bash
npm run dev:astro
npm run build:astro
npm run preview:astro
```

Do not run `wix headless link` or any release command until the Wix site binding has been checked. The current repository has an existing `wix.config.json`, and the site ID must be reconciled with the intended `bsda.online` site first.

## Student portal endpoint source files on `feat/student-portal-full-data`

- `GET /api/students/profile` — read-only profile resolved from `Members/FullData`.
- `GET /api/students/lessons` — current student's protected `LessonRecords` rows.
- `GET /api/students/bookings` — current student's Wix Bookings records filtered by verified contactId.
- `GET /api/students/enrollment` — current member's Wix Pricing Plans orders.
- `GET /api/students/learning-materials` — enabled `portal-video-1` through `portal-video-6` slots from `SiteContent`.
- `GET /api/admin/authorization` — fail-closed approved-staff authorization.
- `GET /api/admin/students`, `PATCH /api/admin/students` — protected student list and limited updates.
- `GET /api/admin/lessons`, `POST /api/admin/lessons`, `PATCH /api/admin/lessons` — protected lesson record operations.
- `GET /api/admin/bookings` — protected Wix Bookings list.
- `GET /api/bookings/availability` — current Wix Bookings availability.
- `POST /api/bookings` — rechecks the selected slot and asks Wix Bookings to create the booking.

These are code paths added for validation, not a claim that they have been deployed or tested against the production CMS schema.

## Important release gates

1. Confirm that the repository's Wix site ID and app ID point to the intended existing site for `bsda.online`.
2. Confirm the actual collection IDs, field keys, permissions, and uniqueness strategy for `StudentProfiles`, `AdminStaffAccess`, and `LessonRecords`.
3. Regenerate `package-lock.json` by running `npm install` after the new dependencies are added.
4. Verify managed login/session behavior, CMS reads/writes, booking creation, and authorization against a non-production Wix project.
5. Add verified Wix owner/collaborator authorization; the current admin endpoint only authorizes explicitly approved site-member staff.
6. Run type checks, build, route tests, security tests, and preview integration tests.
7. Obtain explicit approval before merging to `main` or releasing to `bsda.online`.
