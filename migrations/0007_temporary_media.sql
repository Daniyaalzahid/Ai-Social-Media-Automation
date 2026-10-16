CREATE TABLE media_storage_guard (id int NOT NULL PRIMARY KEY, allocated_bytes bigint unsigned NOT NULL DEFAULT 0, receiving_count int unsigned NOT NULL DEFAULT 0, CONSTRAINT media_guard_singleton CHECK(id=1), CONSTRAINT media_quota_bound CHECK(allocated_bytes<=2147483648), CONSTRAINT media_receiving_bound CHECK(receiving_count<=2)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
INSERT INTO media_storage_guard(id) VALUES (1);
--> statement-breakpoint
CREATE TABLE media_assets (
 id varchar(36) NOT NULL PRIMARY KEY,
 storage_key char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 created_by varchar(36) NOT NULL,
 display_name varchar(160) NOT NULL,
 kind enum('image','video') NOT NULL,
 mime enum('image/jpeg','image/png','image/webp','video/mp4') NOT NULL,
 byte_size int unsigned NOT NULL DEFAULT 0,
 reserved_bytes int unsigned NOT NULL,
 sha256 binary(32) NULL,
 width int unsigned NULL, height int unsigned NULL, duration_ms int unsigned NULL,
 status enum('receiving','temporary','attached','retained','deletion_pending','deleted') NOT NULL,
 created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at datetime(3) NOT NULL,
 deleted_at datetime(3) NULL,
 deletion_reason enum('manual','expired','upload_failed') NULL,
 CONSTRAINT media_creator_fk FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 CONSTRAINT media_key_shape CHECK(REGEXP_LIKE(storage_key,'^[0-9a-f]{64}$','c')),
 CONSTRAINT media_bounds CHECK(reserved_bytes BETWEEN 1 AND 33554432 AND byte_size<=reserved_bytes),
 CONSTRAINT media_kind_mime CHECK((kind='image' AND mime<>'video/mp4' AND reserved_bytes<=8388608) OR (kind='video' AND mime='video/mp4')),
 CONSTRAINT media_expiry CHECK(expires_at>created_at),
 CONSTRAINT media_dimensions CHECK((width IS NULL AND height IS NULL) OR (width BETWEEN 1 AND 8192 AND height BETWEEN 1 AND 8192 AND width*height<=16777216)),
 CONSTRAINT media_duration CHECK(duration_ms IS NULL OR duration_ms BETWEEN 1 AND 600000),
 CONSTRAINT media_ready CHECK(status IN('receiving','deletion_pending','deleted') OR (sha256 IS NOT NULL AND byte_size>0 AND width IS NOT NULL AND height IS NOT NULL)),
 CONSTRAINT media_deleted CHECK((status='deleted' AND deleted_at IS NOT NULL AND deletion_reason IS NOT NULL AND display_name='') OR (status<>'deleted' AND deleted_at IS NULL)),
 CONSTRAINT media_deleting CHECK((status='deletion_pending' AND deletion_reason IS NOT NULL) OR status<>'deletion_pending'),
 INDEX media_expiry_idx(status,expires_at,id), INDEX media_creator_idx(created_by,status,expires_at,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--> statement-breakpoint
INSERT INTO permissions(id,code) VALUES ('24087c77-ccdb-550f-e984-965d5d8e8c26','media.read');
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'24087c77-ccdb-550f-e984-965d5d8e8c26' FROM roles WHERE code='OWNER' AND id='6ccd24b0-fbf2-258b-f4d2-68a2b064e97c';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'24087c77-ccdb-550f-e984-965d5d8e8c26' FROM roles WHERE code='MARKETING_ADMIN' AND id='66055f66-5caa-0919-6a06-8de74e45faa1';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'24087c77-ccdb-550f-e984-965d5d8e8c26' FROM roles WHERE code='CONTENT_CREATOR' AND id='ca1620c4-85a7-5677-655b-fc286202b7cb';

--> statement-breakpoint
INSERT INTO permissions(id,code) VALUES ('361b5bef-435a-331f-878d-b7edc5b727fb','media.manage');
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'361b5bef-435a-331f-878d-b7edc5b727fb' FROM roles WHERE code='OWNER' AND id='6ccd24b0-fbf2-258b-f4d2-68a2b064e97c';
--> statement-breakpoint
INSERT INTO role_permissions(role_id,permission_id) SELECT id,'361b5bef-435a-331f-878d-b7edc5b727fb' FROM roles WHERE code='MARKETING_ADMIN' AND id='66055f66-5caa-0919-6a06-8de74e45faa1';
