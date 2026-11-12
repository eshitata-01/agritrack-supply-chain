-- Q02: Loss by supply-chain stage (event-level measure)
SELECT st.stage_name, SUM(le.loss_kg) AS stage_loss_kg,
       COUNT(*) AS loss_event_count
FROM LOSS_EVENT_FACT le
JOIN STAGE_DIM st ON st.stage_key = le.stage_key
GROUP BY st.stage_name
ORDER BY stage_loss_kg DESC;
-- Note: this reports the stage-event breakdown. Do not add these event losses
-- to shipment-level loss totals unless the event data is reconciled to shipments.
