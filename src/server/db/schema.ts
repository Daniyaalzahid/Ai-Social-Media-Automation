import type { PublishingSchema } from '../publishing/schema';
export { PUBLISH_DROP_ORDER } from '../publishing/schema';
import type { SocialSchema as importSocialSchema } from '../social/schema.ts';
export { SOCIAL_DROP_ORDER } from '../social/schema.ts';
import type { ColumnType } from 'kysely';
import type { Buffer } from 'node:buffer';
import type { BrandData, Kind } from '../../features/brand/model.ts';
type BrandTables = { [K in Exclude<Kind, 'profile'> as `brand_${K}`]: { id: string; brand_id: string } & BrandData<K> };
export const BRAND_DROP_ORDER = ['brand_examples','brand_seasons','brand_categories','brand_locations','brand_contacts','brand_language','brand_voice','brand_platforms','brand_ctas','brand_claims','brand_facts','brand_wording','brand_hashtags','brand_emoji','brands'] as const;

// SQL migrations are authoritative. These types describe the persisted records;
// they are not user-input validators or permission checks.
type DateValue = ColumnType<Date, Date | string, Date | string>;
type DefaultDate = ColumnType<Date, Date | string | undefined, Date | string>;
type DefaultNumber = ColumnType<number, number | undefined, number>;
export type SafeEventMetadata = { reasonCode?: string; changedFields?: string[]; roleCode?: string; selfApproval?: boolean; count?: number };
type EventJson = ColumnType<SafeEventMetadata | null, string | null | undefined, string | null>;

export interface AuditLogsTable {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  session_id: string | null;
  action: string;
  outcome: 'success' | 'failure' | 'denied';
  correlation_id: string;
  metadata_safe_json: EventJson;
  ip_hash: Buffer | null;
  created_at: DefaultDate;
}

export interface AuthChallengesTable {
  id: string;
  user_id: string;
  token_hash: Buffer;
  purpose: 'login_mfa' | 'mfa_enrollment' | 'mfa_recovery' | 'reauthentication' | 'password_reset' | 'password_verified';
  auth_version: number;
  action_code: string | null;
  bound_session_id: ColumnType<string | null, string | null | undefined, string | null>;
  attempts: DefaultNumber;
  created_at: DefaultDate;
  expires_at: DateValue;
  consumed_at: DateValue | null;
  revoked_at: DateValue | null;
}

export interface AuthRateLimitsTable {
  scope: string;
  subject_hash: Buffer;
  window_started_at: DateValue;
  attempts: DefaultNumber;
  blocked_until: DateValue | null;
  expires_at: DateValue;
}

export interface InstallationStateTable {
  id: number;
  bootstrap_consumed_at: DateValue | null;
  initial_owner_id: string | null;
  created_at: DefaultDate;
}

export interface InvitationsTable {
  intended_role_id: ColumnType<string | null, string | null | undefined, string | null>;
  recipient_auth_version: ColumnType<number | null, number | null | undefined, number | null>;
  issuer_auth_version: ColumnType<number | null, number | null | undefined, number | null>;
  id: string;
  user_id: string;
  issued_by: string;
  token_hash: Buffer;
  created_at: DefaultDate;
  expires_at: DateValue;
  accepted_at: DateValue | null;
  revoked_at: DateValue | null;
}

export interface MfaMethodsTable {
  id: string;
  user_id: string;
  type: 'totp';
  state: 'pending' | 'active';
  seed_ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
  key_id: string;
  created_at: DefaultDate;
  enrollment_expires_at: DateValue | null;
  confirmed_at: DateValue | null;
  last_accepted_step: number | null;
  enrollment_challenge_id: ColumnType<string | null, string | null | undefined, string | null>;
}

export interface MfaRecoveryCodesTable {
  id: string;
  method_id: string;
  batch_id: string;
  code_hash: Buffer;
  created_at: DefaultDate;
  used_at: DateValue | null;
  revoked_at: DateValue | null;
}

export interface PasswordResetTokensTable {
  id: string;
  user_id: string;
  issued_by: string;
  token_hash: Buffer;
  created_at: DefaultDate;
  expires_at: DateValue;
  consumed_at: DateValue | null;
  revoked_at: DateValue | null;
}

export interface PermissionsTable {
  id: string;
  code: string;
}

export interface RolePermissionsTable {
  role_id: string;
  permission_id: string;
}

export interface RolesTable {
  id: string;
  code: string;
  label: string;
}

export interface SecurityEventsTable {
  id: string;
  user_id: string | null;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  outcome: 'success' | 'failure' | 'denied';
  correlation_id: string;
  metadata_safe_json: EventJson;
  ip_hash: Buffer | null;
  created_at: DefaultDate;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  token_hash: Buffer;
  auth_version: number;
  created_at: DefaultDate;
  last_activity_at: DateValue;
  idle_expires_at: DateValue;
  absolute_expires_at: DateValue;
  authenticated_at: DateValue;
  mfa_verified_at: DateValue | null;
  reauthenticated_at: DateValue | null;
  revoked_at: DateValue | null;
  revocation_reason: string | null;
  ip_hash: Buffer | null;
  device_class: string | null;
}

export interface UserRolesTable {
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  created_at: DefaultDate;
}

export interface UsersTable {
  id: string;
  email_normalized: string;
  display_name: string;
  // NULL is valid only for invited placeholders; SQL enforces all other states.
  password_hash: string | null;
  status: 'invited' | 'pending_mfa' | 'active' | 'disabled';
  auth_version: DefaultNumber;
  password_changed_at: DateValue | null;
  last_login_at: DateValue | null;
  created_at: DefaultDate;
  updated_at: DefaultDate;
}

export interface MediaAssetsTable {
 id:string;storage_key:string;created_by:string;display_name:string;kind:'image'|'video';mime:'image/jpeg'|'image/png'|'image/webp'|'video/mp4';byte_size:number;reserved_bytes:number;sha256:Buffer|null;width:number|null;height:number|null;duration_ms:number|null;
 status:'receiving'|'temporary'|'attached'|'retained'|'deletion_pending'|'deleted';created_at:DateValue;expires_at:DateValue;deleted_at:DateValue|null;deletion_reason:'manual'|'expired'|'upload_failed'|null;
}
export const MEDIA_DROP_ORDER = ['media_assets','media_storage_guard'] as const;
export const AI_DROP_ORDER = ['ai_generations','ai_generation_guard'] as const;
export interface AiGenerationsTable {
 id:string;created_by:string;request_id:string;input_digest:Buffer;brand_id:string;brand_revision:number;provider:string;model:string;prompt_version:string;platforms_json:ColumnType<unknown,string,string>;provenance_json:ColumnType<unknown,string,string>;language:'ENGLISH'|'URDU'|'ROMAN_URDU'|'MIXED';status:'IN_PROGRESS'|'COMPLETED'|'FAILED'|'REJECTED';failure:import('../../features/ai/model').AiFailure|null;output_json:ColumnType<unknown,string|null,string|null>;usage_json:ColumnType<unknown,string|null,string|null>;created_at:DateValue;lease_expires_at:DateValue;completed_at:DateValue|null;
}
export interface DatabaseSchema extends BrandTables, importSocialSchema, PublishingSchema {
 content_items:{id:string;created_by:string;assigned_to:string;revision_sequence:number;created_at:DateValue};
 content_revisions:{id:string;post_id:string;sequence:number;created_by:string;request_id:string;request_digest:Buffer;title:string;language:'ENGLISH'|'URDU'|'ROMAN_URDU'|'MIXED';source:'MANUAL'|'HUMAN_EDITED'|'AI_GENERATED'|'AI_EDITED';generation_id:string|null;generation_provider:string|null;generation_model:string|null;generation_brand_revision:number|null;brand_revision:number;validated:number;created_at:DateValue};
 content_variants:{revision_id:string;platform:'FACEBOOK'|'INSTAGRAM'|'TIKTOK'|'YOUTUBE'|'LINKEDIN';content_json:ColumnType<unknown,string,string>};
 content_revision_authors:{post_id:string;revision_id:string;user_id:string;authored_revision_id:string};
 content_revision_facts:{revision_id:string;category:import('../../features/brand/model').ContextData<'claims'>['category'];source:import('../../features/content/model').FactSnapshot['source'];source_record_id:string|null;resolved_value:string};
 content_revision_media:{revision_id:string;media_id:string;position:number};
 content_submissions:{id:string;post_id:string;revision_id:string;submitted_by:string;request_id:string;state:'PENDING'|'APPROVED'|'CHANGES_REQUESTED'|'REJECTED';submitted_at:DateValue;validation_brand_revision:number};
 content_decisions:{id:string;submission_id:string;post_id:string;revision_id:string;decided_by:string;request_id:string;decision:'APPROVED'|'CHANGES_REQUESTED'|'REJECTED';note:string;self_approval:number;brand_revision:number;created_at:DateValue};
 content_media_protection:{media_id:string;protected_until:DateValue};
 ai_generations:AiGenerationsTable;
 ai_generation_guard:{id:number};
 media_assets:MediaAssetsTable;
 media_storage_guard:{id:number;allocated_bytes:number;receiving_count:number};
  brands: BrandData<'profile'> & { id: string; slot: number; revision: number; updated_at: DefaultDate };
  team_administration_guard: { id: number };
  audit_logs: AuditLogsTable;
  auth_challenges: AuthChallengesTable;
  auth_rate_limits: AuthRateLimitsTable;
  installation_state: InstallationStateTable;
  invitations: InvitationsTable;
  mfa_methods: MfaMethodsTable;
  mfa_recovery_codes: MfaRecoveryCodesTable;
  password_reset_tokens: PasswordResetTokensTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  roles: RolesTable;
  security_events: SecurityEventsTable;
  sessions: SessionsTable;
  user_roles: UserRolesTable;
  users: UsersTable;
}

export const CONTENT_DROP_ORDER=['content_media_protection','content_decisions','content_submissions','content_revision_media','content_revision_facts','content_revision_authors','content_variants','content_revisions','content_items'] as const;
