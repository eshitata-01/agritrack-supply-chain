import { NextResponse } from "next/server";
import { runOracleMutation, runOracleQuery } from "@backend/config/oracle";
import { getDashboardSnapshot } from "@backend/services/agritrack-service";
import { toPublicDatabaseError } from "@backend/services/database-errors";

export const runtime = "nodejs";

function dateKey(value: string) { return Number(value.replaceAll("-", "")); }

export async function GET() {
  try {
    return NextResponse.json(await getDashboardSnapshot());
  } catch (error) {
    const databaseError = toPublicDatabaseError(error);
    return NextResponse.json({ mode: "error", error: databaseError }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const resource = body.resource;
  try {
    if (resource === "crop") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 100) return NextResponse.json({ error: "Crop name is required (maximum 100 characters)." }, { status: 400 });
      await runOracleMutation(`INSERT INTO CROP_DIM (crop_name, category) VALUES (:name, :category)`, { name, category: String(body.category ?? "Other").slice(0, 60) });
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (resource === "shipment") {
      const crop = String(body.crop ?? "").trim(); const origin = String(body.origin ?? "").trim(); const destination = String(body.destination ?? ""); const region = String(body.region ?? "");
      const date = String(body.dispatchDate ?? ""); const dispatched = Number(body.qtyDispatched); const received = Number(body.qtyReceived); const status = String(body.status ?? "In Transit");
      if (!crop || !origin || !destination || !region || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dispatched) || dispatched <= 0 || !Number.isFinite(received) || received < 0 || received > dispatched || !["Delivered", "In Transit", "Delayed", "High Risk"].includes(status)) return NextResponse.json({ error: "Shipment fields are invalid or outside the supported schema." }, { status: 400 });
      const key = dateKey(date);
      await runOracleMutation(`MERGE INTO DATE_DIM d USING (SELECT :key date_key, TO_DATE(:date_text, 'YYYY-MM-DD') full_date, SUBSTR(:date_text, 1, 7) month_year FROM dual) x ON (d.date_key = x.date_key) WHEN NOT MATCHED THEN INSERT (date_key, full_date, month_year) VALUES (x.date_key, x.full_date, x.month_year)`, { key, date_text: date });
      await runOracleMutation(`MERGE INTO ROUTE_DIM r USING (SELECT :origin origin, :destination destination, :region region FROM dual) x ON (r.origin = x.origin AND r.destination = x.destination AND r.region = x.region) WHEN NOT MATCHED THEN INSERT (origin, destination, region) VALUES (x.origin, x.destination, x.region)`, { origin, destination, region });
      await runOracleMutation(`INSERT INTO SHIPMENT_FACT (shipment_id, crop_key, route_key, dispatch_date_key, qty_dispatched_kg, qty_received_kg, status) VALUES ((SELECT NVL(MAX(shipment_id), 0) + 1 FROM SHIPMENT_FACT), (SELECT crop_key FROM CROP_DIM WHERE crop_name = :crop), (SELECT route_key FROM ROUTE_DIM WHERE origin = :origin AND destination = :destination AND region = :region), :date_key, :dispatched, :received, :status)`, { crop, origin, destination, region, date_key: key, dispatched, received, status });
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (resource === "facility") {
      const name = String(body.name ?? "").trim(); const region = String(body.region ?? "").trim();
      if (!name || !region || name.length > 120 || region.length > 100) return NextResponse.json({ error: "Facility name and region are required." }, { status: 400 });
      await runOracleMutation(`INSERT INTO FACILITY_DIM (facility_name, region) VALUES (:name, :region)`, { name, region });
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (resource === "route") {
      const origin = String(body.origin ?? "").trim(); const destination = String(body.destination ?? "").trim(); const region = String(body.region ?? "").trim();
      if (!origin || !destination || !region || origin.length > 100 || destination.length > 100 || region.length > 100) return NextResponse.json({ error: "Route origin, destination, and region are required." }, { status: 400 });
      await runOracleMutation(`INSERT INTO ROUTE_DIM (origin, destination, region) VALUES (:origin, :destination, :region)`, { origin, destination, region });
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (resource === "loss-event") {
      const shipmentId = Number(String(body.shipmentId ?? "").replace(/^[A-Z]+-/, ""));
      const stage = String(body.stage ?? ""); const facilityId = Number(String(body.facilityId ?? "").replace(/^[A-Z]+-/, ""));
      const date = String(body.recordDate ?? ""); const loss = Number(body.quantityLostKg); const storageDays = Number(body.storageDays ?? 0);
      if (!Number.isInteger(shipmentId) || shipmentId < 1 || !["Harvest / Collection", "Storage", "Transportation", "Delivery"].includes(stage) || !Number.isInteger(facilityId) || facilityId < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(loss) || loss < 0 || !Number.isFinite(storageDays) || storageDays < 0) return NextResponse.json({ error: "Loss event fields are invalid." }, { status: 400 });
      const key = dateKey(date);
      await runOracleMutation(`MERGE INTO DATE_DIM d USING (SELECT :key date_key, TO_DATE(:date_text, 'YYYY-MM-DD') full_date, SUBSTR(:date_text, 1, 7) month_year FROM dual) x ON (d.date_key = x.date_key) WHEN NOT MATCHED THEN INSERT (date_key, full_date, month_year) VALUES (x.date_key, x.full_date, x.month_year)`, { key, date_text: date });
      await runOracleMutation(`INSERT INTO LOSS_EVENT_FACT (loss_event_id, shipment_id, stage_key, facility_key, date_key, loss_kg, storage_days) VALUES ((SELECT NVL(MAX(loss_event_id), 0) + 1 FROM LOSS_EVENT_FACT), :shipment_id, (SELECT stage_key FROM STAGE_DIM WHERE stage_name = :stage), :facility_id, :date_key, :loss, :storage_days)`, { shipment_id: shipmentId, stage, facility_id: facilityId, date_key: key, loss, storage_days: stage === "Storage" ? storageDays : 0 });
      return NextResponse.json({ success: true }, { status: 201 });
    }
    return NextResponse.json({ error: "Unsupported record resource." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Oracle could not save this record. Check schema setup, required lookup rows, and database availability." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const resource = String(body.resource ?? ""); const id = Number(body.id); const record = (body.record ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "A valid numeric record ID is required." }, { status: 400 });
  try {
    if (resource === "crop") {
      const name = String(record.name ?? "").trim();
      if (!name || name.length > 100) return NextResponse.json({ error: "Crop name is required (maximum 100 characters)." }, { status: 400 });
      await runOracleMutation(`UPDATE CROP_DIM SET crop_name = :name, category = :category WHERE crop_key = :id`, { name, category: String(record.category ?? "Other").slice(0, 60), id });
      return NextResponse.json({ success: true });
    }
    if (resource === "shipment") {
      const date = String(record.dispatchDate ?? ""); const dispatched = Number(record.qtyDispatched); const received = Number(record.qtyReceived); const status = String(record.status ?? "In Transit");
      const crop = String(record.crop ?? "").trim(); const origin = String(record.origin ?? "").trim(); const destination = String(record.destination ?? "").trim(); const region = String(record.region ?? "").trim();
      if (!crop || !origin || !destination || !region || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dispatched) || dispatched <= 0 || !Number.isFinite(received) || received < 0 || received > dispatched || !["Delivered", "In Transit", "Delayed", "High Risk"].includes(status)) return NextResponse.json({ error: "Shipment fields are invalid or outside the supported schema." }, { status: 400 });
      const key = dateKey(date);
      await runOracleMutation(`MERGE INTO DATE_DIM d USING (SELECT :key date_key, TO_DATE(:date_text, 'YYYY-MM-DD') full_date, SUBSTR(:date_text, 1, 7) month_year FROM dual) x ON (d.date_key = x.date_key) WHEN NOT MATCHED THEN INSERT (date_key, full_date, month_year) VALUES (x.date_key, x.full_date, x.month_year)`, { key, date_text: date });
      await runOracleMutation(`MERGE INTO ROUTE_DIM r USING (SELECT :origin origin, :destination destination, :region region FROM dual) x ON (r.origin = x.origin AND r.destination = x.destination AND r.region = x.region) WHEN NOT MATCHED THEN INSERT (origin, destination, region) VALUES (x.origin, x.destination, x.region)`, { origin, destination, region });
      await runOracleMutation(`UPDATE SHIPMENT_FACT SET crop_key = (SELECT crop_key FROM CROP_DIM WHERE crop_name = :crop), route_key = (SELECT route_key FROM ROUTE_DIM WHERE origin = :origin AND destination = :destination AND region = :region), dispatch_date_key = :date_key, qty_dispatched_kg = :dispatched, qty_received_kg = :received, status = :status WHERE shipment_id = :id`, { crop, origin, destination, region, date_key: key, dispatched, received, status, id });
      const facilityKey = Number(String(record.facilityId ?? "").replace(/^[A-Z]+-/, ""));
      if (Number.isInteger(facilityKey) && facilityKey > 0) {
        await runOracleMutation(`UPDATE LOSS_EVENT_FACT SET facility_key = :facility_key WHERE shipment_id = :id AND stage_key = (SELECT stage_key FROM STAGE_DIM WHERE stage_name = 'Storage')`, { facility_key: facilityKey, id });
      }
      if (Number.isFinite(Number(record.storageDays)) && Number(record.storageDays) >= 0) {
        await runOracleMutation(`UPDATE LOSS_EVENT_FACT SET storage_days = :storage_days WHERE shipment_id = :id AND stage_key = (SELECT stage_key FROM STAGE_DIM WHERE stage_name = 'Storage')`, { storage_days: Number(record.storageDays), id });
      }
      if (record.syncLossEvents === true) {
        const existing = await runOracleQuery<Record<string, unknown>>(`SELECT le.loss_event_id, st.stage_name, le.facility_key, le.date_key, le.storage_days FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = :id ORDER BY le.loss_event_id`, { id });
        const stages = [
          ["Harvest / Collection", "harvest"], ["Storage", "storage"],
          ["Transportation", "transportation"], ["Delivery", "delivery"],
        ] as const;
        const losses = (record.stageLoss ?? {}) as Record<string, unknown>;
        const preferredFacility = Number(String(record.facilityId ?? "").replace(/^[A-Z]+-/, ""));
        for (const [stage, keyName] of stages) {
          const amount = Number(losses[keyName] ?? 0);
          if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Stage-loss values must be non-negative numbers." }, { status: 400 });
          const stageRows = existing.filter((item) => item.STAGE_NAME === stage);
          if (stageRows.length) {
            const [first, ...duplicates] = stageRows;
            if (amount > 0) await runOracleMutation(`UPDATE LOSS_EVENT_FACT SET loss_kg = :amount WHERE loss_event_id = :event_id`, { amount, event_id: first.LOSS_EVENT_ID });
            else await runOracleMutation(`DELETE FROM LOSS_EVENT_FACT WHERE loss_event_id = :event_id`, { event_id: first.LOSS_EVENT_ID });
            for (const duplicate of duplicates) await runOracleMutation(`DELETE FROM LOSS_EVENT_FACT WHERE loss_event_id = :event_id`, { event_id: duplicate.LOSS_EVENT_ID });
          } else if (amount > 0) {
            const facilities = await runOracleQuery<Record<string, unknown>>(`SELECT NVL(:preferred, MIN(facility_key)) facility_key FROM FACILITY_DIM`, { preferred: preferredFacility > 0 ? preferredFacility : null });
            const facilityKey = Number(facilities[0]?.FACILITY_KEY);
            if (!facilityKey) return NextResponse.json({ error: "Add a facility before recording stage losses." }, { status: 400 });
            await runOracleMutation(`INSERT INTO LOSS_EVENT_FACT (loss_event_id, shipment_id, stage_key, facility_key, date_key, loss_kg, storage_days) VALUES ((SELECT NVL(MAX(loss_event_id), 0) + 1 FROM LOSS_EVENT_FACT), :shipment_id, (SELECT stage_key FROM STAGE_DIM WHERE stage_name = :stage), :facility_key, :date_key, :amount, :storage_days)`, { shipment_id: id, stage, facility_key: facilityKey, date_key: key, amount, storage_days: stage === "Storage" ? Number(record.storageDays ?? 0) : 0 });
          }
        }
      }
      return NextResponse.json({ success: true });
    }
    if (resource === "facility") {
      await runOracleMutation(`UPDATE FACILITY_DIM SET facility_name = :name, region = :region WHERE facility_key = :id`, { name: String(record.name ?? "").trim(), region: String(record.region ?? "").trim(), id });
      return NextResponse.json({ success: true });
    }
    if (resource === "route") {
      await runOracleMutation(`UPDATE ROUTE_DIM SET origin = :origin, destination = :destination, region = :region WHERE route_key = :id`, { origin: String(record.origin ?? "").trim(), destination: String(record.destination ?? "").trim(), region: String(record.region ?? "").trim(), id });
      return NextResponse.json({ success: true });
    }
    if (resource === "loss-event") {
      const stage = String(record.stage ?? ""); const facilityId = Number(record.facilityId); const date = String(record.recordDate ?? ""); const loss = Number(record.quantityLostKg); const storageDays = Number(record.storageDays ?? 0);
      if (!["Harvest / Collection", "Storage", "Transportation", "Delivery"].includes(stage) || !Number.isInteger(facilityId) || facilityId < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(loss) || loss < 0 || !Number.isFinite(storageDays) || storageDays < 0) return NextResponse.json({ error: "Loss event fields are invalid." }, { status: 400 });
      const key = dateKey(date);
      await runOracleMutation(`MERGE INTO DATE_DIM d USING (SELECT :key date_key, TO_DATE(:date_text, 'YYYY-MM-DD') full_date, SUBSTR(:date_text, 1, 7) month_year FROM dual) x ON (d.date_key = x.date_key) WHEN NOT MATCHED THEN INSERT (date_key, full_date, month_year) VALUES (x.date_key, x.full_date, x.month_year)`, { key, date_text: date });
      await runOracleMutation(`UPDATE LOSS_EVENT_FACT SET stage_key = (SELECT stage_key FROM STAGE_DIM WHERE stage_name = :stage), facility_key = :facility_id, date_key = :date_key, loss_kg = :loss, storage_days = :storage_days WHERE loss_event_id = :id`, { stage, facility_id: facilityId, date_key: key, loss, storage_days: stage === "Storage" ? storageDays : 0, id });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unsupported record resource." }, { status: 400 });
  } catch { return NextResponse.json({ error: "Oracle could not update this record. Check its references and database availability." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url); const resource = searchParams.get("resource"); const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "A valid numeric record ID is required." }, { status: 400 });
  try {
    if (resource === "shipment") {
      await runOracleMutation(`DELETE FROM LOSS_EVENT_FACT WHERE shipment_id = :id`, { id });
      await runOracleMutation(`DELETE FROM SHIPMENT_FACT WHERE shipment_id = :id`, { id });
    } else if (resource === "crop") await runOracleMutation(`DELETE FROM CROP_DIM WHERE crop_key = :id`, { id });
    else if (resource === "facility") await runOracleMutation(`DELETE FROM FACILITY_DIM WHERE facility_key = :id`, { id });
    else if (resource === "route") await runOracleMutation(`DELETE FROM ROUTE_DIM WHERE route_key = :id`, { id });
    else if (resource === "loss-event") await runOracleMutation(`DELETE FROM LOSS_EVENT_FACT WHERE loss_event_id = :id`, { id });
    else return NextResponse.json({ error: "Unsupported record resource." }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Oracle could not delete this record. It may still be referenced by shipments or loss events." }, { status: 409 }); }
}
