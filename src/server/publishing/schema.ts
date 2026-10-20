import type { ColumnType } from 'kysely';
import type { SocialProviderId } from '../../features/connections/model';
import type { SocialPack } from '../../features/ai/model';
export const PUBLISH_DROP_ORDER=['publish_assets','publish_events','publish_operations','publish_snapshots'] as const;
export type PublishState='CREATED'|'DISPATCHING'|'ACCEPTED'|'PROCESSING'|'PUBLISHED'|'FAILED'|'UNKNOWN';
type DateValue=ColumnType<Date,Date|string,Date|string>;
type JsonValue=ColumnType<unknown,string,string>;
export type PublishErrorCategory='VALIDATION'|'LOCAL_DATABASE'|'AUTHORIZATION'|'CAPABILITY'|'MEDIA'|'REMOTE_REJECTED'|'REMOTE_PROCESSING'|'PROVIDER_RATE_LIMIT'|'TRANSPORT'|'UNCONFIRMED';
export type PublishErrorCode='INVALID'|'UNAVAILABLE'|'ACCESS_LOST'|'UNSUPPORTED'|'RATE_LIMITED'|'REJECTED'|'PROCESSING_FAILED'|'OUTCOME_UNKNOWN';
export interface PublishingSchema {
 publish_snapshots:{id:string;brand_id:string;post_id:string;revision_id:string;approval_decision_id:string;actor_id:string;request_id:string;authorization_id:string;destination_id:string;provider:SocialProviderId;platform:keyof SocialPack;operation_type:'PUBLISH';approval_decision:'APPROVED'|'CHANGES_REQUESTED'|'REJECTED';authorization_version:number;validation_brand_revision:number;destination_remote_id:Buffer;capability_ref:Buffer;content_json:JsonValue;options_json:JsonValue;copy_hash:Buffer;intent_hash:Buffer;request_digest:Buffer;created_at:DateValue;confirmation_expires_at:DateValue};
 publish_operations:{id:string;state:PublishState;version:number;last_event_sequence:number;updated_at:DateValue;dispatch_started_at:DateValue|null;dispatch_deadline:DateValue|null;dispatch_claim_hash:Buffer|null;last_status_check_at:DateValue|null};
 publish_events:{operation_id:string;sequence:number;state:PublishState;boundary:'LOCAL'|'REMOTE'|'UNCONFIRMED';observed_at:DateValue;error_category:PublishErrorCategory|null;safe_error_code:PublishErrorCode|null;remote_publication_id:Buffer|null;remote_processing_id:Buffer|null;published_at:DateValue|null};
 publish_assets:{snapshot_id:string;revision_id:string;media_id:string;position:number;mime:'image/jpeg'|'image/png'|'image/webp'|'video/mp4';byte_size:number;sha256:Buffer;width:number;height:number;duration_ms:number|null;created_at:DateValue;protected_until:DateValue};
}
