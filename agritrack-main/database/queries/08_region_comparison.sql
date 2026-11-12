-- Q08: Region-wise shipment loss comparison
SELECT r.region,
       COUNT(*) AS shipment_count,
       SUM(s.qty_dispatched_kg) AS dispatched_kg,
       SUM(s.qty_dispatched_kg - s.qty_received_kg) AS loss_kg,
       ROUND(100 * SUM(s.qty_dispatched_kg - s.qty_received_kg)
             / NULLIF(SUM(s.qty_dispatched_kg), 0), 2) AS loss_pct
FROM SHIPMENT_FACT s
JOIN ROUTE_DIM r ON r.route_key = s.route_key
GROUP BY r.region
ORDER BY loss_pct DESC;
