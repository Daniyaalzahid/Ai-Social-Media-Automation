-- Security data constraints only; no trigger/SUPER privilege dependency.
INSERT INTO installation_state (id) VALUES (1);
--> statement-breakpoint
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_metadata_keys CHECK
(metadata_safe_json IS NULL OR (JSON_TYPE(metadata_safe_json) = 'OBJECT' AND
 JSON_CONTAINS(JSON_ARRAY('reasonCode', 'changedFields', 'roleCode', 'selfApproval', 'count'), JSON_KEYS(metadata_safe_json))));
--> statement-breakpoint
ALTER TABLE security_events ADD CONSTRAINT security_events_metadata_keys CHECK
(metadata_safe_json IS NULL OR (JSON_TYPE(metadata_safe_json) = 'OBJECT' AND
 JSON_CONTAINS(JSON_ARRAY('reasonCode', 'changedFields', 'roleCode', 'selfApproval', 'count'), JSON_KEYS(metadata_safe_json))));
