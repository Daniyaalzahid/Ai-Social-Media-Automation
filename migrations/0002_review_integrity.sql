-- Review defects only: preserve existing migrations and apply corrective constraints forward.
-- Passwordless accounts are invitation placeholders. Non-invited accounts retain a hash.
ALTER TABLE users DROP CHECK users_active_password,
 ADD CONSTRAINT users_active_password CHECK
 (status = 'invited' OR (password_hash IS NOT NULL AND OCTET_LENGTH(password_hash) > 0));
--> statement-breakpoint
ALTER TABLE auth_challenges ADD CONSTRAINT auth_challenges_lifecycle CHECK
 ((consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at <= expires_at)) AND
  (revoked_at IS NULL OR revoked_at >= created_at));
--> statement-breakpoint
ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_lifecycle CHECK
 ((consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at <= expires_at)) AND
  (revoked_at IS NULL OR revoked_at >= created_at));
--> statement-breakpoint
ALTER TABLE invitations ADD CONSTRAINT invitations_lifecycle CHECK
 ((accepted_at IS NULL OR (accepted_at >= created_at AND accepted_at <= expires_at)) AND
  (revoked_at IS NULL OR revoked_at >= created_at));
--> statement-breakpoint
ALTER TABLE sessions ADD CONSTRAINT sessions_revocation_integrity CHECK
 ((revoked_at IS NULL AND revocation_reason IS NULL) OR
  (revoked_at IS NOT NULL AND revoked_at >= created_at AND revocation_reason IS NOT NULL AND CHAR_LENGTH(revocation_reason) > 0));
--> statement-breakpoint
ALTER TABLE mfa_methods ADD CONSTRAINT mfa_methods_timeline CHECK
 ((enrollment_expires_at IS NULL OR enrollment_expires_at > created_at) AND
  (confirmed_at IS NULL OR confirmed_at >= created_at) AND
  (state <> 'pending' OR last_accepted_step IS NULL));
--> statement-breakpoint
ALTER TABLE mfa_recovery_codes ADD CONSTRAINT mfa_recovery_codes_lifecycle CHECK
 ((used_at IS NULL OR used_at >= created_at) AND (revoked_at IS NULL OR revoked_at >= created_at));
