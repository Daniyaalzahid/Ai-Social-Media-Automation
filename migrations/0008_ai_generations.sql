CREATE TABLE ai_generation_guard(id int NOT NULL PRIMARY KEY, CONSTRAINT ai_guard_singleton CHECK(id=1)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
INSERT INTO ai_generation_guard(id) VALUES(1);
--> statement-breakpoint
CREATE TABLE ai_generations(
 id varchar(36) NOT NULL PRIMARY KEY,
 created_by varchar(36) NOT NULL,
 request_id varchar(36) NOT NULL,
 input_digest binary(32) NOT NULL,
 brand_id varchar(36) NOT NULL,
 brand_revision int unsigned NOT NULL,
 provider enum('openrouter') NOT NULL,
 model varchar(160) NOT NULL,
 prompt_version varchar(80) NOT NULL,
 platforms_json json NOT NULL,
 provenance_json json NOT NULL,
 language enum('ENGLISH','URDU','ROMAN_URDU','MIXED') NOT NULL,
 status enum('IN_PROGRESS','COMPLETED','FAILED','REJECTED') NOT NULL,
 failure enum('INPUT_INVALID','UNAUTHORIZED','RATE_LIMITED','BUSY','PROVIDER_UNAVAILABLE','PROVIDER_RATE_LIMITED','PROVIDER_TIMEOUT','PROVIDER_AUTH_ERROR','MODEL_UNAVAILABLE','CAPABILITY_UNAVAILABLE','RESPONSE_TOO_LARGE','RESPONSE_MALFORMED','RESPONSE_SCHEMA_INVALID','CLAIM_POLICY_REJECTED','CANCELLED','UNAVAILABLE') NULL,
 output_json json NULL,
 usage_json json NULL,
 created_at datetime(3) NOT NULL,
 lease_expires_at datetime(3) NOT NULL,
 completed_at datetime(3) NULL,
 CONSTRAINT ai_creator_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT ai_brand_fk FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT ai_revision CHECK(brand_revision>0),
 CONSTRAINT ai_model CHECK(CHAR_LENGTH(model) BETWEEN 1 AND 160 AND CHAR_LENGTH(prompt_version) BETWEEN 1 AND 80),
 CONSTRAINT ai_platforms CHECK(JSON_TYPE(platforms_json)='ARRAY' AND JSON_LENGTH(platforms_json) BETWEEN 1 AND 5 AND JSON_SCHEMA_VALID('{"type":"array","items":{"enum":["FACEBOOK","INSTAGRAM","TIKTOK","YOUTUBE","LINKEDIN"]},"uniqueItems":true}',platforms_json)),
 CONSTRAINT ai_provenance CHECK(JSON_TYPE(provenance_json)='ARRAY' AND JSON_LENGTH(provenance_json)<=13 AND JSON_STORAGE_SIZE(provenance_json)<=4096),
 CONSTRAINT ai_lease CHECK(lease_expires_at>created_at),
 CONSTRAINT ai_output CHECK(output_json IS NULL OR (JSON_TYPE(output_json)='OBJECT' AND JSON_STORAGE_SIZE(output_json)<=32768)),
 CONSTRAINT ai_usage CHECK(usage_json IS NULL OR (JSON_TYPE(usage_json)='OBJECT' AND JSON_STORAGE_SIZE(usage_json)<=256)),
 CONSTRAINT ai_terminal CHECK((status='IN_PROGRESS' AND completed_at IS NULL AND failure IS NULL AND output_json IS NULL) OR (status='COMPLETED' AND completed_at IS NOT NULL AND completed_at>=created_at AND failure IS NULL AND output_json IS NOT NULL) OR (status IN('FAILED','REJECTED') AND completed_at IS NOT NULL AND completed_at>=created_at AND failure IS NOT NULL AND output_json IS NULL)),
 UNIQUE KEY ai_request_once(created_by,request_id),
 INDEX ai_active_idx(status,lease_expires_at,id),
 INDEX ai_actor_idx(created_by,created_at,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
