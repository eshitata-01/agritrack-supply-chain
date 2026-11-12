-- Q06: Crop loss ranking using a CTE, RANK and DENSE_RANK
WITH crop_loss AS (
  SELECT c.crop_name,
         COUNT(DISTINCT s.shipment_id) AS shipment_count,
         SUM(s.qty_dispatched_kg) AS dispatched_kg,
         SUM(s.qty_dispatched_kg - s.qty_received_kg) AS loss_kg
  FROM CROP_DIM c
  JOIN SHIPMENT_FACT s ON c.crop_key = s.crop_key
  GROUP BY c.crop_name
  HAVING SUM(s.qty_dispatched_kg) > 0
)
SELECT crop_name, shipment_count, dispatched_kg, loss_kg,
       RANK() OVER (ORDER BY loss_kg DESC) AS loss_rank,
       DENSE_RANK() OVER (ORDER BY loss_kg DESC) AS dense_loss_rank
FROM crop_loss
ORDER BY loss_rank, crop_name;
