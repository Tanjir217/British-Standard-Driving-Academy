# BSDA Backend Architecture

## Goal

Keep the React/Vite application independent from the backend vendor and from business/admin credentials.

The frontend consumes BSDA application services. Those services expose BSDA domain models and operations; Wix-specific response shapes, SDK calls, credentials, and business rules stay outside React pages and components.

## Runtime boundary

```
React pages/components
        |
        v
src/services/*
        |
        +--------------------+
        |                    |
        v                    v
Public/member Wix SDK    Protected API boundary
        |                    |
        v                    v
Wix Bookings/Plans      Protected Wix CMS
Wix Members             Student Profiles
                        Lesson Records
```

React must not import Wix SDK packages from pages/components and must not contain business/admin credentials.

## Business roles

- Visitor: can browse public content and submit a booking/inquiry.
- Student: can access their own protected student data, bookings, payments, lesson history, progress and assigned training content.
- Instructor: can access assigned students, availability, bookings, lesson records and permitted training content.
- Admin: operates the academy: bookings, students, instructors, packages, payments, content, schedules and reporting.
- Super Admin: manages administrative configuration and privileged access.

Role enforcement belongs to the authentication/authorization boundary, not to visual components.

## Core entities

1. Students
2. Instructors
3. Packages
4. Lessons
5. Bookings
6. Payments
7. Progress Records
8. Training Videos
9. Availability
10. Notifications
11. FAQs
12. Testimonials
13. Site Settings

## Current Wix source-of-truth mapping

- Wix Members → authentication and member identity.
- Wix Bookings → services, staff, availability, appointments and booking lifecycle.
- Wix Pricing Plans → commercial packages and entitlements.
- Wix Payments/eCommerce → payment and checkout state.
- Wix CMS → BSDA-specific Student Profiles and Lesson Records.

The React application must not duplicate prices, package entitlements, booking availability, or payment state as independent sources of truth.

## Implemented on this branch

The Wix client now exposes visitor/member-safe modules for:

- Wix Members.
- Wix Bookings services.
- Wix Bookings availability.
- Wix Bookings booking creation/retrieval.
- Wix Bookings staff providers.
- Wix Pricing Plans V3 public plans.
- Wix Pricing Plans member order module.
- Wix CMS data module behind the service boundary.

The package service reads public pricing plans from Wix instead of using hard-coded commercial prices.

The booking service reads appointment services and availability from Wix and has a real booking creation contract that requires an actual Wix availability slot. The old fake `BSDA-DEMO-...` booking reference has been removed.

The student service can identify the currently authenticated Wix member. It intentionally does not query Student Profiles from the browser because that collection is Admin-only.

The lesson service intentionally does not query Lesson Records from the browser because that collection is Admin-only.

## Important Wix framework constraint

The current project is a **Vite/React Wix-managed Headless frontend**, not an Astro Wix-managed Headless project.

Current Wix documentation states that Wix-managed Headless projects using other frameworks do not support Wix CLI extensions directly. The full Wix-managed Astro path supports custom backend extensions and backend HTTP endpoints; other frameworks have the limited integration path and are directed toward the self-managed approach when custom backend extensions are required.

Therefore we must **not invent or place privileged Wix backend code inside the React/Vite frontend**.

This matters because our Student Profiles and Lesson Records collections are deliberately configured as Admin-only. A browser/member OAuth client cannot safely perform those Admin-only CMS reads/writes.

### Production options for the protected CMS boundary

There are two valid paths:

**Option A — keep Vite/React**

Keep the current frontend and add a separate application API/backend. That backend authenticates the Wix member request, performs authorization, and uses a server-side Wix admin/API-key client for the protected CMS operations. Wix remains the system of record; the separate backend is only the application/security boundary.

**Option B — move the Wix-managed frontend integration to Astro**

Keep the same React domain/service contracts where practical, but move the Wix-managed project to Astro so Wix CLI backend extensions and HTTP endpoints can be used directly on Wix infrastructure.

We should not choose between these paths silently. The choice affects deployment, authentication, secrets, CORS, and production operations.

## Protected data rules

- A student may only read their own Student Profile and Lesson Records.
- An instructor may only access students and bookings assigned to them, subject to admin policy.
- Admins may operate academy records.
- Public pages may only receive public-safe fields.
- Payment secrets, admin credentials, API keys and privileged Wix clients never reach the browser.
- Student Profiles and Lesson Records remain Admin-only at the Wix CMS collection level.
- Progress values should ultimately be derived from Wix Pricing Plan entitlements plus completed Lesson Records rather than manually trusted counters.

## Core operational workflow

```
Lead / booking request
        -> Wix booking service selected
        -> availability retrieved from Wix
        -> slot revalidated
        -> booking created
        -> Wix checkout/payment
        -> booking confirmed
        -> instructor assigned
        -> lesson delivered
        -> Lesson Record created/updated
        -> progress calculated
        -> student portal receives authorized data
```

A booking is not considered paid merely because a client submitted a payment method. Payment state must be explicit and independently verifiable.

## Service boundary

Services expose BSDA operations such as:

- `packageService.list()`
- `instructorService.list()`
- `bookingService.listServices()`
- `bookingService.getAvailability()`
- `bookingService.create()`
- `studentService.getCurrentMemberId()`
- `studentService.getCurrent()`
- `lessonService.listForCurrentStudent()`
- `paymentService.listForCurrentStudent()`

The exact backend implementation can change without changing page components.

## Security

No secret should be added to:

- React components.
- `src/data/site.ts` for commercial source-of-truth values.
- `wix.config.json`.
- `VITE_*` environment variables.

The Wix Headless client ID is public. Wix API keys, client secrets, payment credentials, and privileged server credentials are secret.

The previous browser `localStorage` token persistence has been removed from the Wix client foundation. Member authentication should use the current Wix OAuth flow and a production-appropriate token/session strategy before launch.

## Verification requirements before production

1. Install the new `@wix/pricing-plans` dependency and regenerate `package-lock.json`.
2. Run `npm run build`.
3. Test Wix member login/logout.
4. Test public Pricing Plans retrieval against the four BSDA plans.
5. Test Bookings service retrieval and availability.
6. Test booking creation only with a live availability slot.
7. Complete the protected backend decision: Vite + separate API or Wix-managed Astro.
8. Implement authenticated Student Profile and Lesson Record access only after that decision.
9. Re-test CMS authorization with student, instructor and admin identities.
10. Do not merge this branch into `test` until the integration is reviewed and explicitly approved.
