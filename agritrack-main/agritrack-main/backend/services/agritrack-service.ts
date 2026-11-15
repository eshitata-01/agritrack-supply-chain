import { runOracleQuery } from "@backend/config/oracle";

const SHIPMENT_SQL = `
SELECT s.shipment_id, c.crop_name, r.region, r.origin, r.destination,
       TO_CHAR(d.full_date, 'YYYY-MM-DD') dispatch_date, s.status,
       s.qty_dispatched_kg, s.qty_received_kg,
       NVL((SELECT MAX(f.facility_key) FROM LOSS_EVENT_FACT le JOIN FACILITY_DIM f ON f.facility_key = le.facility_key JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id AND st.stage_name = 'Storage'), 0) facility_key,
       NVL((SELECT MAX(f.facility_name) FROM LOSS_EVENT_FACT le JOIN FACILITY_DIM f ON f.facility_key = le.facility_key JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id AND st.stage_name = 'Storage'), 'Unassigned facility') facility_name,
       r.route_key, NVL((SELECT AVG(le.storage_days) FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id AND st.stage_name = 'Storage'), 0) storage_days,
       NVL((SELECT SUM(CASE WHEN st.stage_name = 'Harvest / Collection' THEN le.loss_kg ELSE 0 END) FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id), 0) harvest_loss,
       NVL((SELECT SUM(CASE WHEN st.stage_name = 'Storage' THEN le.loss_kg ELSE 0 END) FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id), 0) storage_loss,
       NVL((SELECT SUM(CASE WHEN st.stage_name = 'Transportation' THEN le.loss_kg ELSE 0 END) FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id), 0) transportation_loss,
       NVL((SELECT SUM(CASE WHEN st.stage_name = 'Delivery' THEN le.loss_kg ELSE 0 END) FROM LOSS_EVENT_FACT le JOIN STAGE_DIM st ON st.stage_key = le.stage_key WHERE le.shipment_id = s.shipment_id), 0) delivery_loss
FROM SHIPMENT_FACT s
JOIN CROP_DIM c ON c.crop_key = s.crop_key
JOIN ROUTE_DIM r ON r.route_key = s.route_key
JOIN DATE_DIM d ON d.date_key = s.dispatch_date_key
ORDER BY d.full_date DESC, s.shipment_id DESC`;

const CATALOG_SQL = `SELECT 'CROP' kind, TO_CHAR(crop_key) id, crop_name name, category detail, CAST(NULL AS VARCHAR2(100)) region, CAST(NULL AS VARCHAR2(100)) destination FROM CROP_DIM
UNION ALL SELECT 'FACILITY', TO_CHAR(facility_key), facility_name, NULL, region, NULL FROM FACILITY_DIM
UNION ALL SELECT 'ROUTE', TO_CHAR(route_key), origin, destination, region, destination FROM ROUTE_DIM`;

export async function getDashboardSnapshot() {
  const [rows, catalogs] = await Promise.all([
    runOracleQuery<Record<string, unknown>>(SHIPMENT_SQL),
    runOracleQuery<Record<string, unknown>>(CATALOG_SQL),
  ]);
  const shipments = rows.map((row) => ({
    id: `SHP-${String(row.SHIPMENT_ID)}`,
    crop: String(row.CROP_NAME), region: String(row.REGION), origin: String(row.ORIGIN), destination: String(row.DESTINATION),
    dispatchDate: String(row.DISPATCH_DATE), expectedDate: String(row.DISPATCH_DATE), actualDate: null,
    qtyDispatched: Number(row.QTY_DISPATCHED_KG), qtyReceived: Number(row.QTY_RECEIVED_KG), status: String(row.STATUS),
    facilityId: String(row.FACILITY_KEY), facility: String(row.FACILITY_NAME), routeId: String(row.ROUTE_KEY),
    route: `${row.ORIGIN} → ${row.DESTINATION}`, vehicleId: "—", storageDays: Number(row.STORAGE_DAYS), transitHours: 0,
    stageLoss: { harvest: Number(row.HARVEST_LOSS), storage: Number(row.STORAGE_LOSS), transportation: Number(row.TRANSPORTATION_LOSS), delivery: Number(row.DELIVERY_LOSS) },
  }));
  const crops = catalogs.filter((item) => item.KIND === "CROP").map((item) => ({ id: `CR-${item.ID}`, name: String(item.NAME), category: String(item.DETAIL ?? "Other"), season: "Not stored in schema" }));
  const facilities = catalogs.filter((item) => item.KIND === "FACILITY").map((item) => ({ id: `ST-${item.ID}`, name: String(item.NAME), location: String(item.REGION) }));
  const routes = catalogs.filter((item) => item.KIND === "ROUTE").map((item) => ({ id: `RT-${item.ID}`, source: String(item.NAME), destination: String(item.DESTINATION), region: String(item.REGION) }));
  return { mode: "oracle" as const, shipments, crops, facilities, routes, regions: [...new Set(shipments.map((item) => item.region))] };
}
