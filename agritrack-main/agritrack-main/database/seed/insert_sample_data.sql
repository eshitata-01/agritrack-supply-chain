-- Small reproducible demo dataset. IDs are explicit for easy cross-reference.
INSERT INTO CROP_DIM (crop_key, crop_name, category) VALUES (1, 'Tomato', 'Vegetable');
INSERT INTO CROP_DIM (crop_key, crop_name, category) VALUES (2, 'Potato', 'Vegetable');
INSERT INTO CROP_DIM (crop_key, crop_name, category) VALUES (3, 'Mango', 'Fruit');
INSERT INTO CROP_DIM (crop_key, crop_name, category) VALUES (4, 'Onion', 'Vegetable');

INSERT INTO STAGE_DIM (stage_key, stage_name) VALUES (1, 'Harvest / Collection');
INSERT INTO STAGE_DIM (stage_key, stage_name) VALUES (2, 'Storage');
INSERT INTO STAGE_DIM (stage_key, stage_name) VALUES (3, 'Transportation');
INSERT INTO STAGE_DIM (stage_key, stage_name) VALUES (4, 'Delivery');

INSERT INTO ROUTE_DIM (route_key, origin, destination, region) VALUES (1, 'Coimbatore', 'Chennai', 'North Tamil Nadu');
INSERT INTO ROUTE_DIM (route_key, origin, destination, region) VALUES (2, 'Madurai', 'Chennai', 'South Tamil Nadu');
INSERT INTO ROUTE_DIM (route_key, origin, destination, region) VALUES (3, 'Salem', 'Trichy', 'Central Tamil Nadu');

INSERT INTO FACILITY_DIM (facility_key, facility_name, region) VALUES (1, 'Coimbatore Cold Store', 'West Tamil Nadu');
INSERT INTO FACILITY_DIM (facility_key, facility_name, region) VALUES (2, 'Chennai Distribution Hub', 'North Tamil Nadu');
INSERT INTO FACILITY_DIM (facility_key, facility_name, region) VALUES (3, 'Madurai Agri Warehouse', 'South Tamil Nadu');

INSERT INTO DATE_DIM (date_key, full_date, month_year) VALUES (20260105, DATE '2026-01-05', '2026-01');
INSERT INTO DATE_DIM (date_key, full_date, month_year) VALUES (20260210, DATE '2026-02-10', '2026-02');
INSERT INTO DATE_DIM (date_key, full_date, month_year) VALUES (20260315, DATE '2026-03-15', '2026-03');
INSERT INTO DATE_DIM (date_key, full_date, month_year) VALUES (20260420, DATE '2026-04-20', '2026-04');
INSERT INTO DATE_DIM (date_key, full_date, month_year) VALUES (20260512, DATE '2026-05-12', '2026-05');

INSERT INTO SHIPMENT_FACT
(shipment_id, crop_key, route_key, dispatch_date_key, qty_dispatched_kg, qty_received_kg, status)
VALUES (1001, 1, 1, 20260105, 5000, 4650, 'Delivered');
INSERT INTO SHIPMENT_FACT VALUES (1002, 2, 2, 20260210, 7000, 6650, 'Delivered');
INSERT INTO SHIPMENT_FACT VALUES (1003, 3, 1, 20260315, 4000, 3500, 'Delayed');
INSERT INTO SHIPMENT_FACT VALUES (1004, 4, 3, 20260420, 6000, 5700, 'Delivered');
INSERT INTO SHIPMENT_FACT VALUES (1005, 1, 2, 20260512, 5500, 4950, 'High Risk');
INSERT INTO SHIPMENT_FACT VALUES (1006, 3, 3, 20260512, 3000, 2760, 'In Transit');

-- Stage event losses are an explanatory breakdown, not the shipment loss total.
INSERT INTO LOSS_EVENT_FACT VALUES (1, 1001, 1, 1, 20260105, 80, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (2, 1001, 2, 1, 20260105, 150, 4);
INSERT INTO LOSS_EVENT_FACT VALUES (3, 1001, 3, 2, 20260105, 120, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (4, 1002, 2, 3, 20260210, 180, 6);
INSERT INTO LOSS_EVENT_FACT VALUES (5, 1002, 3, 2, 20260210, 170, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (6, 1003, 1, 3, 20260315, 100, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (7, 1003, 2, 1, 20260315, 220, 8);
INSERT INTO LOSS_EVENT_FACT VALUES (8, 1003, 3, 2, 20260315, 180, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (9, 1004, 2, 3, 20260420, 160, 5);
INSERT INTO LOSS_EVENT_FACT VALUES (10, 1004, 4, 2, 20260420, 140, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (11, 1005, 1, 1, 20260512, 120, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (12, 1005, 2, 1, 20260512, 250, 9);
INSERT INTO LOSS_EVENT_FACT VALUES (13, 1005, 3, 2, 20260512, 180, 0);
INSERT INTO LOSS_EVENT_FACT VALUES (14, 1006, 2, 3, 20260512, 110, 3);
INSERT INTO LOSS_EVENT_FACT VALUES (15, 1006, 3, 2, 20260512, 130, 0);

COMMIT;
