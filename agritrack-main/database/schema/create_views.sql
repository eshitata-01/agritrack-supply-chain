-- Shipment-level view: one row per shipment; safe for shipment-level totals.
CREATE OR REPLACE VIEW V_SHIPMENT_LOSS AS
SELECT s.shipment_id, c.crop_name, r.origin, r.destination, r.region,
       d.full_date AS dispatch_date, s.status,
       s.qty_dispatched_kg, s.qty_received_kg,
       (s.qty_dispatched_kg - s.qty_received_kg) AS loss_kg,
       CASE WHEN s.qty_dispatched_kg = 0 THEN 0
            ELSE ROUND((s.qty_dispatched_kg - s.qty_received_kg)
                       / s.qty_dispatched_kg * 100, 2)
       END AS loss_pct
FROM SHIPMENT_FACT s
JOIN CROP_DIM c ON c.crop_key = s.crop_key
JOIN ROUTE_DIM r ON r.route_key = s.route_key
JOIN DATE_DIM d ON d.date_key = s.dispatch_date_key;

-- Stage-level view: one row per loss event. Do not join this to shipment totals
-- and sum shipment-level loss in the same aggregation (that would multiply rows).
CREATE OR REPLACE VIEW V_STAGE_LOSS AS
SELECT le.loss_event_id, le.shipment_id, st.stage_name,
       f.facility_name, f.region, dt.full_date AS event_date,
       le.loss_kg, le.storage_days
FROM LOSS_EVENT_FACT le
JOIN STAGE_DIM st ON st.stage_key = le.stage_key
JOIN FACILITY_DIM f ON f.facility_key = le.facility_key
JOIN DATE_DIM dt ON dt.date_key = le.date_key;
