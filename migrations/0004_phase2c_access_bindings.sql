-- Bind pending enrollment and purpose-bound step-up proofs to their originating state.
ALTER TABLE auth_challenges ADD COLUMN bound_session_id char(36) NULL,
 ADD CONSTRAINT auth_challenges_bound_session_fk FOREIGN KEY (bound_session_id) REFERENCES sessions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE mfa_methods ADD COLUMN enrollment_challenge_id char(36) NULL,
 ADD CONSTRAINT mfa_methods_enrollment_challenge_fk FOREIGN KEY (enrollment_challenge_id) REFERENCES auth_challenges(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
--> statement-breakpoint
ALTER TABLE mfa_methods ADD CONSTRAINT mfa_methods_active_binding CHECK (state <> 'active' OR enrollment_challenge_id IS NULL);
