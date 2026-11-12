-- Q01: Monthly shipment-level loss trend
SELECT d.month_year,
       SUM(s.qty_dispatched_kg) AS dispatched_kg,
       SUM(s.qty_dispatched_kg - s.qty_received_kg) AS loss_kg,
       ROUND(100 * SUM(s.qty_dispatched_kg - s.qty_received_kg)
             / NULLIF(SUM(s.qty_dispatched_kg), 0), 2) AS loss_pct
FROM SHIPMENT_FACT s
JOIN DATE_DIM d ON d.date_key = s.dispatch_date_key
GROUP BY d.month_year
ORDER BY d.month_year;
