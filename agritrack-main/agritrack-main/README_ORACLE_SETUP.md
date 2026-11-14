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
1. Copy `.env.example` to `.env.local`.
2. Set `ORACLE_USER`, `ORACLE_PASSWORD`, and `ORACLE_CONNECT_STRING` to credentials for your Oracle schema. Keep `.env.local` private; it is ignored by git.
3. Restart the Next.js development server.
4. Request `GET /api/agritrack` and `GET /api/sql-insights/06`. A successful response reports `mode: "oracle"`; the app displays that status in the footer and SQL Insights.

The dashboard reads shipment totals from `SHIPMENT_FACT`, crop and route labels from their dimensions, dates from `DATE_DIM`, and stage breakdowns from `LOSS_EVENT_FACT`. SQL Insights executes only the eight allowlisted files in `database/queries/`; browser requests cannot submit SQL text. The records API uses fixed statements and bind variables for crop, facility, route, shipment, and loss-event operations.

Without a working Oracle connection, `/api/agritrack` returns the labelled seed dataset with `mode: "demo"`. Record edits in demo mode only change the current browser session and are not persisted. SQL Insights shows the same kind of local preview and labels it as demo data.

## Schema limits
The provided schema does not store crop season, expected or actual delivery dates, vehicle IDs, transit hours, or a facility directly on a shipment. Those existing UI fields are not persisted to Oracle; the live mapping uses dispatch date for the displayed expected date, shows unavailable transit values as zero/blank, and associates facilities through loss events. A crop season value is displayed as "Not stored in schema" in live mode. Add these columns only through a separately reviewed schema migration if they are needed for the demonstration.

Never commit `.env.local` or expose database credentials in browser code. The API route only executes the eight allowlisted SQL files; it does not accept arbitrary SQL from the browser.

## Important limitations
- Adding these files does not create an Oracle database or configure credentials.
- Database operations cannot be verified as live until Oracle credentials and a reachable Oracle instance are provided.
- A static query preview is not proof of live Oracle execution; check the visible mode label and API `mode` response.
- Stage-event loss and shipment-level loss are separate measures. Do not sum both measures together; that can double-count or produce inconsistent totals.
