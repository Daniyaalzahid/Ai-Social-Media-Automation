-- A restricted password-stage proof, never a workspace session or MFA implementation.
ALTER TABLE auth_challenges MODIFY COLUMN purpose
 enum('login_mfa','mfa_enrollment','mfa_recovery','reauthentication','password_reset','password_verified') NOT NULL;
