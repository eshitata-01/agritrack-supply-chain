-- Q04: Route risk flags using GROUP BY and HAVING
SELECT r.origin, r.destination, r.region,
       COUNT(*) AS shipment_count,
       SUM(s.qty_dispatched_kg - s.qty_received_kg) AS loss_kg,
       ROUND(100 * SUM(s.qty_dispatched_kg - s.qty_received_kg)
             / NULLIF(SUM(s.qty_dispatched_kg), 0), 2) AS loss_pct,
       CASE WHEN 100 * SUM(s.qty_dispatched_kg - s.qty_received_kg)
                       / NULLIF(SUM(s.qty_dispatched_kg), 0) >= 7
            THEN 'HIGH RISK' ELSE 'NORMAL' END AS risk_flag
FROM SHIPMENT_FACT s
JOIN ROUTE_DIM r ON r.route_key = s.route_key
GROUP BY r.origin, r.destination, r.region
HAVING COUNT(*) >= 1
ORDER BY loss_pct DESC;
