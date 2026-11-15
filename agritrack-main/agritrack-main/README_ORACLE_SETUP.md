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
1. Copy `.env.example` to the repository-root `.env.local`.
2. Set `ORACLE_USER` and `ORACLE_PASSWORD` to an account created in the target pluggable database. The local listener is configured for IPv4 loopback, so use `127.0.0.1:1521/FREEPDB1`. Oracle Free's default PDB service is `FREEPDB1`.
3. In that same schema, run the SQL scripts above, then restart the Next.js development server from the repository root with `pnpm dev`.
4. Check `GET /api/health/db`. It returns `connected: true` plus the database, container, service, and driver identity only after a real query to `dual` succeeds. Then check `GET /api/agritrack` and `GET /api/sql-insights/06` for live records.

Keep `.env.local` private; it is ignored by git. The server-side helper reads these values from the process environment or the repository-root `.env.local`. The browser receives neither credentials nor raw database errors.

The dashboard reads shipment totals from `SHIPMENT_FACT`, crop and route labels from their dimensions, dates from `DATE_DIM`, and stage breakdowns from `LOSS_EVENT_FACT`. SQL Insights executes only the eight allowlisted files in `database/queries/`; browser requests cannot submit SQL text. The records API uses fixed statements and bind variables for crop, facility, route, shipment, and loss-event operations.

There is no demo-data fallback in the application. Without Oracle configuration or a reachable database, the APIs return an error and the frontend visibly reports Oracle as unavailable; it does not show seeded records or claim that edits were saved.

## Schema limits
The provided schema does not store crop season, expected or actual delivery dates, vehicle IDs, transit hours, or a facility directly on a shipment. Those existing UI fields are not persisted to Oracle; the live mapping uses dispatch date for the displayed expected date, shows unavailable transit values as zero/blank, and associates facilities through loss events. A crop season value is displayed as "Not stored in schema" in live mode. Add these columns only through a separately reviewed schema migration if they are needed for the demonstration.

Never commit `.env.local` or expose database credentials in browser code. The API route only executes the eight allowlisted SQL files; it does not accept arbitrary SQL from the browser.

## Important limitations
- Adding these files does not create an Oracle database or configure credentials.
- Database operations can be verified as live only when the Oracle listener is running, the configured service is reachable, credentials work, and the supplied schema scripts have been run.
- Check `/api/health/db` and the frontend's Oracle status before demonstrating live data.
- Stage-event loss and shipment-level loss are separate measures. Do not sum both measures together; that can double-count or produce inconsistent totals.
