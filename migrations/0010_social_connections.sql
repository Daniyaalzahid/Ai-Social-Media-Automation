CREATE TABLE social_guard(id tinyint unsigned PRIMARY KEY,CONSTRAINT social_guard_single CHECK(id=1)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
INSERT INTO social_guard(id) VALUES(1);
--> statement-breakpoint
CREATE TABLE social_authorizations(
 id varchar(36) PRIMARY KEY,brand_id varchar(36) NOT NULL,provider enum('META','TIKTOK','YOUTUBE','LINKEDIN') NOT NULL,
 connected_by varchar(36) NOT NULL,subject varchar(200) NOT NULL,status enum('CONNECTED','LIMITED','RECONNECT_REQUIRED','DISCONNECTED') NOT NULL,
 version int unsigned NOT NULL,scopes_json json NOT NULL,selected_id varchar(36) NULL,
 created_at datetime(3) NOT NULL,expires_at datetime(3) NOT NULL,refresh_expires_at datetime(3) NULL,refresh_lease datetime(3) NULL,
 CONSTRAINT social_auth_brand FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_auth_actor FOREIGN KEY(connected_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_auth_version CHECK(version>0),
 CONSTRAINT social_auth_subject CHECK(CHAR_LENGTH(subject) BETWEEN 1 AND 200),
 CONSTRAINT social_scopes CHECK(JSON_SCHEMA_VALID('{"type":"array","maxItems":30,"uniqueItems":true,"items":{"type":"string","minLength":1,"maxLength":150}}',scopes_json) AND JSON_STORAGE_SIZE(scopes_json)<=8192),
 CONSTRAINT social_expiry CHECK(expires_at>created_at AND (refresh_expires_at IS NULL OR refresh_expires_at>created_at)),
 UNIQUE KEY social_identity(brand_id,provider,subject), UNIQUE KEY social_auth_binding(id,brand_id,provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE social_destinations(
 id varchar(36) PRIMARY KEY,authorization_id varchar(36) NOT NULL,brand_id varchar(36) NOT NULL,provider enum('META','TIKTOK','YOUTUBE','LINKEDIN') NOT NULL,
 remote_id varchar(200) NOT NULL,kind enum('PAGE','INSTAGRAM_PROFESSIONAL','TIKTOK_ACCOUNT','YOUTUBE_CHANNEL','LINKEDIN_ORGANIZATION') NOT NULL,
 display_name varchar(160) NOT NULL,handle varchar(100) NULL,active boolean NOT NULL,
 CONSTRAINT social_destination_auth FOREIGN KEY(authorization_id,brand_id,provider) REFERENCES social_authorizations(id,brand_id,provider) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_destination_bounds CHECK(CHAR_LENGTH(remote_id) BETWEEN 1 AND 200 AND CHAR_LENGTH(display_name) BETWEEN 1 AND 160 AND active IN(0,1)),
 CONSTRAINT social_destination_kind CHECK((provider='META' AND kind IN('PAGE','INSTAGRAM_PROFESSIONAL')) OR (provider='TIKTOK' AND kind='TIKTOK_ACCOUNT') OR (provider='YOUTUBE' AND kind='YOUTUBE_CHANNEL') OR (provider='LINKEDIN' AND kind='LINKEDIN_ORGANIZATION')),
 UNIQUE KEY social_destination_remote(authorization_id,kind,remote_id), UNIQUE KEY social_destination_binding(id,authorization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE social_credentials(
 authorization_id varchar(36) NOT NULL,purpose enum('access','refresh') NOT NULL,version int unsigned NOT NULL,
 ciphertext varbinary(8192) NOT NULL,iv binary(12) NOT NULL,tag binary(16) NOT NULL,key_id varchar(40) NOT NULL,
 PRIMARY KEY(authorization_id,purpose),
 CONSTRAINT social_credentials_auth FOREIGN KEY(authorization_id) REFERENCES social_authorizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_credentials_bounds CHECK(version>0 AND OCTET_LENGTH(ciphertext)>0 AND CAST(key_id AS BINARY)=CAST('primary-v1' AS BINARY))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE social_transactions(
 id varchar(36) PRIMARY KEY,brand_id varchar(36) NOT NULL,provider enum('META','TIKTOK','YOUTUBE','LINKEDIN') NOT NULL,
 actor_id varchar(36) NOT NULL,session_id varchar(36) NOT NULL,auth_version int unsigned NOT NULL,
 state_hash binary(32) NOT NULL,status enum('PENDING','EXCHANGING','COMPLETED','FAILED') NOT NULL,
 target_id varchar(36) NOT NULL,target_version int unsigned NULL,redirect_uri varchar(512) NOT NULL,requested_json json NOT NULL,
 pkce_ciphertext varbinary(8192) NULL,pkce_iv binary(12) NULL,pkce_tag binary(16) NULL,key_id varchar(40) NULL,
 created_at datetime(3) NOT NULL,expires_at datetime(3) NOT NULL,finished_at datetime(3) NULL,
 CONSTRAINT social_tx_brand FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_tx_actor FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_tx_session FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT social_tx_expiry CHECK(expires_at>created_at AND auth_version>0 AND (target_version IS NULL OR target_version>0)),
 CONSTRAINT social_tx_pkce CHECK((pkce_ciphertext IS NULL AND pkce_iv IS NULL AND pkce_tag IS NULL AND key_id IS NULL) OR (pkce_ciphertext IS NOT NULL AND pkce_iv IS NOT NULL AND pkce_tag IS NOT NULL AND key_id IS NOT NULL AND CAST(key_id AS BINARY)=CAST('primary-v1' AS BINARY) AND OCTET_LENGTH(pkce_ciphertext)>0)),
 CONSTRAINT social_tx_terminal CHECK((status IN('PENDING','EXCHANGING') AND finished_at IS NULL) OR (status IN('COMPLETED','FAILED') AND finished_at IS NOT NULL)),
 CONSTRAINT social_tx_requested CHECK(JSON_SCHEMA_VALID('{"type":"array","maxItems":30,"uniqueItems":true,"items":{"type":"string","minLength":1,"maxLength":150}}',requested_json)),
 UNIQUE KEY social_state(state_hash), INDEX social_tx_expiry_idx(expires_at,id), INDEX social_tx_actor_idx(actor_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--> statement-breakpoint
INSERT INTO permissions(id,code) VALUES('360f73b6-35b2-a967-154d-b3ab5e4c73fb','integrations.read');
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.id='360f73b6-35b2-a967-154d-b3ab5e4c73fb' WHERE r.id='6ccd24b0-fbf2-258b-f4d2-68a2b064e97c';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.id='360f73b6-35b2-a967-154d-b3ab5e4c73fb' WHERE r.id='66055f66-5caa-0919-6a06-8de74e45faa1';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.id='6086583a-e2d6-4ecd-7970-a056371e45ab' WHERE r.id='66055f66-5caa-0919-6a06-8de74e45faa1';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r JOIN permissions p ON p.id='360f73b6-35b2-a967-154d-b3ab5e4c73fb' WHERE r.id='ca1620c4-85a7-5677-655b-fc286202b7cb';
