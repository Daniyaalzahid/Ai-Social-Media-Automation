-- Cross-user administrative serialization; bootstrap state remains permanently separate.
CREATE TABLE team_administration_guard (
 id tinyint NOT NULL PRIMARY KEY,
 CONSTRAINT team_administration_guard_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
INSERT INTO team_administration_guard (id) VALUES (1);
--> statement-breakpoint
ALTER TABLE invitations
 ADD COLUMN intended_role_id varchar(36) NULL,
 ADD COLUMN recipient_auth_version int NULL,
 ADD COLUMN issuer_auth_version int NULL,
 ADD CONSTRAINT invitations_role_fk FOREIGN KEY (intended_role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
 ADD CONSTRAINT invitations_binding CHECK (
 (intended_role_id IS NULL AND recipient_auth_version IS NULL AND issuer_auth_version IS NULL) OR
 (intended_role_id IS NOT NULL AND recipient_auth_version IS NOT NULL AND recipient_auth_version > 0 AND issuer_auth_version IS NOT NULL AND issuer_auth_version > 0));
