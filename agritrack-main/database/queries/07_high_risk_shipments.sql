-- Q07: High-risk shipments (shipment-level loss threshold)
SELECT shipment_id, crop_name, origin, destination, dispatch_date,
       qty_dispatched_kg, qty_received_kg, loss_kg, loss_pct, status
FROM V_SHIPMENT_LOSS
WHERE loss_pct >= 7
ORDER BY loss_pct DESC, shipment_id;
