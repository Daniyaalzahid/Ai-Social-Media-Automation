-- Initial DDL generated during ORM evaluation, then reviewed/hardened for MySQL 8.0.16+.
-- Kysely executes this versioned SQL; no Drizzle or Prisma runtime is retained.
CREATE TABLE `audit_logs` (
	`id` char(36) NOT NULL,
	`actor_user_id` char(36),
	`target_user_id` char(36),
	`session_id` char(36),
	`action` varchar(80) NOT NULL,
	`outcome` enum('success','failure','denied') NOT NULL,
	`correlation_id` char(36) NOT NULL,
	`metadata_safe_json` json,
	`ip_hash` varbinary(32),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_logs_ip_hash_length` CHECK (`ip_hash` IS NULL OR OCTET_LENGTH(`ip_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `auth_challenges` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` varbinary(32) NOT NULL,
	`purpose` enum('login_mfa','mfa_enrollment','mfa_recovery','reauthentication','password_reset') NOT NULL,
	`auth_version` int unsigned NOT NULL,
	`action_code` varchar(80),
	`attempts` smallint unsigned NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`revoked_at` datetime(3),
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_challenges_token_hash_uq` UNIQUE(`token_hash`),
	CONSTRAINT `auth_challenges_expiry` CHECK(`auth_challenges`.`expires_at` > `auth_challenges`.`created_at`),
	CONSTRAINT `auth_challenges_auth_version_positive` CHECK(`auth_challenges`.`auth_version` > 0),
	CONSTRAINT `auth_challenges_token_hash_length` CHECK (`token_hash` IS NULL OR OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`scope` varchar(40) NOT NULL,
	`subject_hash` varbinary(32) NOT NULL,
	`window_started_at` datetime(3) NOT NULL,
	`attempts` int unsigned NOT NULL DEFAULT 0,
	`blocked_until` datetime(3),
	`expires_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_rate_limits_scope_subject_hash_pk` PRIMARY KEY(`scope`,`subject_hash`),
	CONSTRAINT `auth_rate_limits_expiry` CHECK(`auth_rate_limits`.`expires_at` > `auth_rate_limits`.`window_started_at`),
	CONSTRAINT `auth_rate_limits_subject_hash_length` CHECK (`subject_hash` IS NULL OR OCTET_LENGTH(`subject_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `installation_state` (
	`id` smallint unsigned NOT NULL,
	`bootstrap_consumed_at` datetime(3),
	`initial_owner_id` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `installation_state_id` PRIMARY KEY(`id`),
	CONSTRAINT `installation_state_singleton` CHECK(`installation_state`.`id` = 1),
	CONSTRAINT `installation_state_bootstrap_integrity` CHECK((`installation_state`.`bootstrap_consumed_at` IS NULL AND `installation_state`.`initial_owner_id` IS NULL) OR (`installation_state`.`bootstrap_consumed_at` IS NOT NULL AND `installation_state`.`initial_owner_id` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`issued_by` char(36) NOT NULL,
	`token_hash` varbinary(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`expires_at` datetime(3) NOT NULL,
	`accepted_at` datetime(3),
	`revoked_at` datetime(3),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_hash_uq` UNIQUE(`token_hash`),
	CONSTRAINT `invitations_expiry` CHECK(`invitations`.`expires_at` > `invitations`.`created_at`),
	CONSTRAINT `invitations_token_hash_length` CHECK (`token_hash` IS NULL OR OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `mfa_methods` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`type` enum('totp') NOT NULL,
	`state` enum('pending','active') NOT NULL,
	`seed_ciphertext` varbinary(512) NOT NULL,
	`iv` varbinary(12) NOT NULL,
	`tag` varbinary(16) NOT NULL,
	`key_id` varchar(40) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`enrollment_expires_at` datetime(3),
	`confirmed_at` datetime(3),
	`last_accepted_step` int unsigned,
	CONSTRAINT `mfa_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `mfa_methods_user_type_uq` UNIQUE(`user_id`,`type`),
	CONSTRAINT `mfa_methods_state_integrity` CHECK((`mfa_methods`.`state` = 'pending' AND `mfa_methods`.`confirmed_at` IS NULL AND `mfa_methods`.`enrollment_expires_at` IS NOT NULL) OR (`mfa_methods`.`state` = 'active' AND `mfa_methods`.`confirmed_at` IS NOT NULL AND `mfa_methods`.`enrollment_expires_at` IS NULL)),
	CONSTRAINT `mfa_methods_seed_not_empty` CHECK(OCTET_LENGTH(`mfa_methods`.`seed_ciphertext`) > 0),
	CONSTRAINT `mfa_methods_iv_length` CHECK (`iv` IS NULL OR OCTET_LENGTH(`iv`) = 12),
	CONSTRAINT `mfa_methods_tag_length` CHECK (`tag` IS NULL OR OCTET_LENGTH(`tag`) = 16)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `mfa_recovery_codes` (
	`id` char(36) NOT NULL,
	`method_id` char(36) NOT NULL,
	`batch_id` char(36) NOT NULL,
	`code_hash` varbinary(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`used_at` datetime(3),
	`revoked_at` datetime(3),
	CONSTRAINT `mfa_recovery_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `mfa_recovery_codes_hash_uq` UNIQUE(`code_hash`),
	CONSTRAINT `mfa_recovery_codes_code_hash_length` CHECK (`code_hash` IS NULL OR OCTET_LENGTH(`code_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`issued_by` char(36) NOT NULL,
	`token_hash` varbinary(32) NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`expires_at` datetime(3) NOT NULL,
	`consumed_at` datetime(3),
	`revoked_at` datetime(3),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_uq` UNIQUE(`token_hash`),
	CONSTRAINT `password_reset_tokens_expiry` CHECK(`password_reset_tokens`.`expires_at` > `password_reset_tokens`.`created_at`),
	CONSTRAINT `password_reset_tokens_token_hash_length` CHECK (`token_hash` IS NULL OR OCTET_LENGTH(`token_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` char(36) NOT NULL,
	`code` varchar(80) NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_code_uq` UNIQUE(`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` char(36) NOT NULL,
	`permission_id` char(36) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` char(36) NOT NULL,
	`code` varchar(40) NOT NULL,
	`label` varchar(80) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_code_uq` UNIQUE(`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` char(36) NOT NULL,
	`user_id` char(36),
	`type` varchar(80) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`outcome` enum('success','failure','denied') NOT NULL,
	`correlation_id` char(36) NOT NULL,
	`metadata_safe_json` json,
	`ip_hash` varbinary(32),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `security_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `security_events_ip_hash_length` CHECK (`ip_hash` IS NULL OR OCTET_LENGTH(`ip_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`token_hash` varbinary(32) NOT NULL,
	`auth_version` int unsigned NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`last_activity_at` datetime(3) NOT NULL,
	`idle_expires_at` datetime(3) NOT NULL,
	`absolute_expires_at` datetime(3) NOT NULL,
	`authenticated_at` datetime(3) NOT NULL,
	`mfa_verified_at` datetime(3),
	`reauthenticated_at` datetime(3),
	`revoked_at` datetime(3),
	`revocation_reason` varchar(40),
	`ip_hash` varbinary(32),
	`device_class` varchar(40),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_uq` UNIQUE(`token_hash`),
	CONSTRAINT `sessions_valid_times` CHECK(`sessions`.`absolute_expires_at` > `sessions`.`created_at` AND `sessions`.`idle_expires_at` <= `sessions`.`absolute_expires_at` AND `sessions`.`last_activity_at` >= `sessions`.`created_at` AND `sessions`.`idle_expires_at` > `sessions`.`last_activity_at`),
	CONSTRAINT `sessions_auth_version_positive` CHECK(`sessions`.`auth_version` > 0),
	CONSTRAINT `sessions_token_hash_length` CHECK (`token_hash` IS NULL OR OCTET_LENGTH(`token_hash`) = 32),
	CONSTRAINT `sessions_ip_hash_length` CHECK (`ip_hash` IS NULL OR OCTET_LENGTH(`ip_hash`) = 32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` char(36) NOT NULL,
	`role_id` char(36) NOT NULL,
	`assigned_by` char(36),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`),
	CONSTRAINT `user_roles_one_role_uq` UNIQUE(`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
CREATE TABLE `users` (
	`id` char(36) NOT NULL,
	`email_normalized` varchar(254) NOT NULL,
	`display_name` varchar(120) NOT NULL,
	`password_hash` varchar(255),
	`status` enum('invited','pending_mfa','active','disabled') NOT NULL DEFAULT 'invited',
	`auth_version` int unsigned NOT NULL DEFAULT 1,
	`password_changed_at` datetime(3),
	`last_login_at` datetime(3),
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_normalized_uq` UNIQUE(`email_normalized`),
	CONSTRAINT `users_auth_version_positive` CHECK(`users`.`auth_version` > 0),
	CONSTRAINT `users_email_canonical` CHECK(BINARY `users`.`email_normalized` = BINARY LOWER(TRIM(`users`.`email_normalized`)) AND CHAR_LENGTH(`users`.`email_normalized`) > 3),
	CONSTRAINT `users_active_password` CHECK(`users`.`status` NOT IN ('active', 'pending_mfa') OR `users`.`password_hash` IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_target_user_id_users_id_fk` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD CONSTRAINT `auth_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `installation_state` ADD CONSTRAINT `installation_state_initial_owner_id_users_id_fk` FOREIGN KEY (`initial_owner_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_issued_by_users_id_fk` FOREIGN KEY (`issued_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `mfa_methods` ADD CONSTRAINT `mfa_methods_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `mfa_recovery_codes` ADD CONSTRAINT `mfa_recovery_codes_method_id_mfa_methods_id_fk` FOREIGN KEY (`method_id`) REFERENCES `mfa_methods`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_issued_by_users_id_fk` FOREIGN KEY (`issued_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_created_idx` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_target_created_idx` ON `audit_logs` (`target_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_created_idx` ON `audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_correlation_idx` ON `audit_logs` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `auth_challenges_user_purpose_idx` ON `auth_challenges` (`user_id`,`purpose`);--> statement-breakpoint
CREATE INDEX `auth_challenges_expiry_idx` ON `auth_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `auth_rate_limits_expiry_idx` ON `auth_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE INDEX `invitations_user_idx` ON `invitations` (`user_id`);--> statement-breakpoint
CREATE INDEX `invitations_expiry_idx` ON `invitations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `mfa_methods_enrollment_expiry_idx` ON `mfa_methods` (`enrollment_expires_at`);--> statement-breakpoint
CREATE INDEX `mfa_recovery_codes_method_batch_idx` ON `mfa_recovery_codes` (`method_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `mfa_recovery_codes_created_idx` ON `mfa_recovery_codes` (`created_at`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_expiry_idx` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission_id`);--> statement-breakpoint
CREATE INDEX `security_events_created_idx` ON `security_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `security_events_user_created_idx` ON `security_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `security_events_type_created_idx` ON `security_events` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `security_events_correlation_idx` ON `security_events` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_active_idx` ON `sessions` (`user_id`,`revoked_at`,`absolute_expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_idle_expiry_idx` ON `sessions` (`idle_expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_absolute_expiry_idx` ON `sessions` (`absolute_expires_at`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);