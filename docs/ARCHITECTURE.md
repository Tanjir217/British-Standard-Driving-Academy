# BSDA Architecture

## Branch model
- main: approved client-demo baseline.
- test: integration and upcoming functionality branch.
- feature/*: isolated implementation work; merge into test first.
- main receives tested changes from test via pull request.

## Frontend structure
- `src/App.tsx`: routing/composition only.
- `src/pages/`: route-level screens.
- `src/components/`: reusable presentation and interaction components.
- `src/data/`: static/demo content.
- `src/services/`: integration boundary for backend operations.
- `src/styles.css`: shared visual system.

## Backend strategy
The frontend should not know whether data comes from Wix, Supabase, a custom Node API, or another provider. Page components call service functions. Service implementations can then be swapped without rebuilding the UI.

For Wix, the cleanest future path is Wix Headless: keep this custom frontend and connect it to Wix business APIs for CMS, bookings, members, payments/checkout and other business data. Wix currently supports managed headless frontends and self-managed headless frontends; the exact hosting choice depends on framework support and how much Wix should manage.
