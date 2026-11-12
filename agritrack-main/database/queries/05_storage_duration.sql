-- Q05: Storage duration versus recorded storage loss
SELECT CASE
         WHEN le.storage_days <= 2 THEN '0-2 days'
         WHEN le.storage_days <= 5 THEN '3-5 days'
         WHEN le.storage_days <= 8 THEN '6-8 days'
         ELSE 'More than 8 days'
       END AS storage_duration_band,
       COUNT(*) AS event_count,
       ROUND(AVG(le.loss_kg), 2) AS avg_loss_kg,
       SUM(le.loss_kg) AS total_loss_kg
FROM LOSS_EVENT_FACT le
JOIN STAGE_DIM st ON st.stage_key = le.stage_key
WHERE st.stage_name = 'Storage'
GROUP BY CASE
           WHEN le.storage_days <= 2 THEN '0-2 days'
           WHEN le.storage_days <= 5 THEN '3-5 days'
           WHEN le.storage_days <= 8 THEN '6-8 days'
           ELSE 'More than 8 days'
         END
HAVING COUNT(*) >= 1
ORDER BY total_loss_kg DESC;
