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
        v
Application API boundary
        |
        v
Backend implementation
        |
        v
Wix Headless / Wix business services
```

React must not import Wix SDK packages from pages/components and must not contain business/admin credentials.

## Business roles

- Visitor: can browse public content and submit a booking/inquiry.
- Student: can access their own profile, bookings, payments, lesson history, progress and assigned training content.
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

## Core operational workflow

```
Lead / booking request
        -> booking created
        -> payment recorded / verified
        -> booking confirmed
        -> instructor assigned
        -> lesson delivered
        -> progress recorded
        -> training media attached when applicable
        -> student portal updated
```

A booking is not considered paid merely because a client submitted a payment method. Payment state must be explicit and independently verifiable.

## Data ownership rules

- A student may only read their own protected student data.
- An instructor may only access students and bookings assigned to them, subject to admin policy.
- Admins may operate academy records.
- Public pages may only receive public-safe fields.
- Payment secrets, admin credentials, API keys and privileged Wix clients never reach the browser.
- The service layer normalizes backend data before it reaches UI code.

## Service boundary

Services should expose operations such as:

- `packageService.list()`
- `instructorService.list()`
- `bookingService.getAvailability()`
- `bookingService.create()`
- `studentService.getCurrent()`
- `lessonService.listForStudent()`
- `paymentService.getForStudent()`

The exact backend implementation can change without changing page components.

## Wix implementation

Wix is the selected production backend/hosting platform. Wix-specific SDK/API code should be implemented behind this boundary. The first integration pass must map each domain model to the appropriate Wix capability (CMS, Bookings, Members, Payments/eCommerce, media) rather than exposing Wix records directly to React.

This branch intentionally establishes the application/backend contract first. It does not put Wix credentials or privileged business authentication into the React application.
