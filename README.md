# freightsimple.ai

Carrier-side freight operations command center for OK GO Freight — Carrier V1.

## V1 Modules

- Carrier Dashboard
- Load Board / Load Hub
- Load Detail
- Operations Inbox
- Tracking
- RMI Dashboard
- CRM
- Profit Intelligence
- Integrations

## V1 Integration Shells

The app includes mock provider adapter shells and connection status for DAT, Truckstop / Internet Truckstop, Gmail, Outlook, Google Calendar, MacroPoint, FourKites, Samsara, Motive, Geotab, and Manual ELD entry.

## Development

```bash
npm install
npm run dev
```

## Backend Setup (Supabase)

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Apply SQL migration in [supabase/migrations/20260424_initial_schema.sql](/Users/gregbean/Documents/New project 2/supabase/migrations/20260424_initial_schema.sql).
4. Seed a carrier row with `id = org_okgo_carrier_v1` (or set `VITE_DEFAULT_CARRIER_ORG_ID`).

The app currently falls back to browser local storage when Supabase is not configured or unavailable.

## Build

```bash
npm run build
```
