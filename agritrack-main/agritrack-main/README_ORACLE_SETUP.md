# AgriTrack Oracle SQL implementation

## What is included
- Seven Oracle tables matching the AgriTrack star-style dimension/fact design.
- Shipment-level and stage-event-level views.
- A reproducible sample dataset.
- Eight separate Advanced SQL query files.
- A server-side `node-oracledb` connection helper and an allowlisted Next.js API route.

## Run the SQL scripts
In Oracle SQL Developer, connect to your own Oracle schema and run, in order:
1. `database/schema/create_tables.sql`
2. `database/seed/insert_sample_data.sql`
3. `database/schema/create_views.sql`
4. Run each file in `database/queries/` individually.

The scripts use Oracle SQL syntax. The seed data is synthetic demonstration data, not real farm or shipment records.

## Configure the web backend
1. Install the driver: `pnpm add oracledb`.
2. Copy `.env.example` to `.env.local`.
3. Enter credentials and a valid Oracle connect string in `.env.local`.
4. Restart the Next.js development server.
5. Test `GET /api/sql-insights/06` after Oracle is running and the scripts have been executed.

Never commit `.env.local` or expose database credentials in browser code. The API route only executes the eight allowlisted SQL files; it does not accept arbitrary SQL from the browser.

## Important limitations
- Adding these files does not create an Oracle database or configure credentials.
- The API returns a clear 503 response until a reachable Oracle instance and valid credentials are configured.
- The frontend must call the API route to display live query results. A static query preview is not proof of live Oracle execution.
- Stage-event loss and shipment-level loss are separate measures. Do not sum both measures together; that can double-count or produce inconsistent totals.
