-- Q03: Facility storage loss ranking using a window function
WITH facility_loss AS (
  SELECT f.facility_key, f.facility_name, f.region,
         SUM(le.loss_kg) AS storage_loss_kg,
         AVG(le.storage_days) AS avg_storage_days
  FROM LOSS_EVENT_FACT le
  JOIN STAGE_DIM st ON st.stage_key = le.stage_key
  JOIN FACILITY_DIM f ON f.facility_key = le.facility_key
  WHERE st.stage_name = 'Storage'
  GROUP BY f.facility_key, f.facility_name, f.region
)
SELECT facility_name, region, storage_loss_kg, avg_storage_days,
       RANK() OVER (ORDER BY storage_loss_kg DESC) AS loss_rank
FROM facility_loss
ORDER BY loss_rank;
