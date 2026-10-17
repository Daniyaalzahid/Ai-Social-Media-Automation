import type { ColumnType } from 'kysely';
import type { SocialProviderId,SafeDestination } from '../../features/connections/model.ts';
type D=ColumnType<Date,Date,Date>;
type J=ColumnType<unknown,string,string>;
export interface SocialSchema{
 social_guard:{id:number};
 social_transactions:{id:string;brand_id:string;provider:SocialProviderId;actor_id:string;session_id:string;auth_version:number;state_hash:Buffer;status:'PENDING'|'EXCHANGING'|'COMPLETED'|'FAILED';target_id:string;target_version:number|null;redirect_uri:string;requested_json:J;pkce_ciphertext:Buffer|null;pkce_iv:Buffer|null;pkce_tag:Buffer|null;key_id:string|null;created_at:D;expires_at:D;finished_at:D|null};
 social_authorizations:{id:string;brand_id:string;provider:SocialProviderId;connected_by:string;subject:string;status:SafeDestination['status'];version:number;scopes_json:J;selected_id:string|null;created_at:D;expires_at:D;refresh_expires_at:D|null;refresh_lease:D|null};
 social_credentials:{authorization_id:string;purpose:'access'|'refresh';version:number;ciphertext:Buffer;iv:Buffer;tag:Buffer;key_id:string};
 social_destinations:{id:string;authorization_id:string;brand_id:string;provider:SocialProviderId;remote_id:string;kind:SafeDestination['type'];display_name:string;handle:string|null;active:number};
}
export const SOCIAL_DROP_ORDER=['social_credentials','social_transactions','social_destinations','social_authorizations','social_guard'] as const;
