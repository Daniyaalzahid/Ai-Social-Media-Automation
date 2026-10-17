import { sql,type Kysely } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
// Explicit ownership: never classify security constraints from a name prefix alone.
export const foundationTables=['audit_logs','auth_challenges','auth_rate_limits','installation_state','invitations','mfa_methods','mfa_recovery_codes','password_reset_tokens','permissions','role_permissions','roles','security_events','sessions','team_administration_guard','user_roles','users'] as const;
export const socialTables=['social_guard','social_authorizations','social_destinations','social_credentials','social_transactions'] as const;
export type CheckContract={table:string;name:string;columns:string[];enforced:'YES'};
export const check=(table:string,name:string,columns:string[]):CheckContract=>({table,name,columns:[...columns].sort(),enforced:'YES'});
export type ForeignKeyContract={name:string;table:string;columns:string[];parent:string;parentColumns:string[];deletion:'RESTRICT';updating:'RESTRICT'};
export const foreignKey=(name:string,table:string,columns:string[],parent:string,parentColumns:string[]):ForeignKeyContract=>({name,table,columns,parent,parentColumns,deletion:'RESTRICT',updating:'RESTRICT'});
// Independent expected identities derived from reviewed 0010, not live DB counts.
export const socialChecks=[
 check('social_guard','social_guard_single',['id']),
 check('social_authorizations','social_auth_version',['version']),
 check('social_authorizations','social_auth_subject',['subject']),
 check('social_authorizations','social_scopes',['scopes_json']),
 check('social_authorizations','social_expiry',['created_at','expires_at','refresh_expires_at']),
 check('social_destinations','social_destination_bounds',['remote_id','display_name','active']),
 check('social_destinations','social_destination_kind',['provider','kind']),
 check('social_credentials','social_credentials_bounds',['version','ciphertext','key_id']),
 check('social_transactions','social_tx_expiry',['created_at','expires_at','auth_version','target_version']),
 check('social_transactions','social_tx_pkce',['pkce_ciphertext','pkce_iv','pkce_tag','key_id']),
 check('social_transactions','social_tx_terminal',['status','finished_at']),
 check('social_transactions','social_tx_requested',['requested_json']),
];
export const socialForeignKeys=[
 foreignKey('social_auth_brand','social_authorizations',['brand_id'],'brands',['id']),
 foreignKey('social_auth_actor','social_authorizations',['connected_by'],'users',['id']),
 foreignKey('social_destination_auth','social_destinations',['authorization_id','brand_id','provider'],'social_authorizations',['id','brand_id','provider']),
 foreignKey('social_credentials_auth','social_credentials',['authorization_id'],'social_authorizations',['id']),
 foreignKey('social_tx_brand','social_transactions',['brand_id'],'brands',['id']),
 foreignKey('social_tx_actor','social_transactions',['actor_id'],'users',['id']),
 foreignKey('social_tx_session','social_transactions',['session_id'],'sessions',['id']),
];
export const sortContracts=<T extends {table:string;name:string}>(rows:readonly T[])=>[...rows].sort((a,b)=>`${a.table}/${a.name}`.localeCompare(`${b.table}/${b.name}`));
export async function installedChecks(db:Kysely<DatabaseSchema>,tables:readonly string[]){
 const rows=await sql<{table:string;name:string;enforced:string;clause:string;schema:string;current_schema:string}>`SELECT t.TABLE_NAME AS \`table\`,t.CONSTRAINT_NAME AS name,t.ENFORCED AS enforced,c.CHECK_CLAUSE AS clause,t.CONSTRAINT_SCHEMA AS \`schema\`,DATABASE() AS current_schema FROM information_schema.TABLE_CONSTRAINTS t JOIN information_schema.CHECK_CONSTRAINTS c ON c.CONSTRAINT_SCHEMA=t.CONSTRAINT_SCHEMA AND c.CONSTRAINT_NAME=t.CONSTRAINT_NAME WHERE t.CONSTRAINT_SCHEMA=DATABASE() AND t.CONSTRAINT_TYPE='CHECK' AND t.TABLE_NAME IN (${sql.join(tables)})`.execute(db);
 return sortContracts(rows.rows.map(r=>{if(r.schema!==r.current_schema)throw new Error('Constraint schema mismatch');const stripped=r.clause.replace(/'(?:''|\\.|[^'\\])*'/g,"''"),columns=[...new Set([...stripped.matchAll(/`((?:``|[^`])+)`/g)].filter(m=>!/^\s*\./.test(stripped.slice(m.index!+m[0].length))).map(m=>m[1]!.replaceAll('``','`')))].sort();return{table:r.table,name:r.name,columns,enforced:r.enforced};}));
}
export async function installedForeignKeys(db:Kysely<DatabaseSchema>,tables:readonly string[]){
 const rows=await sql<{table:string;name:string;column:string;position:number;parent:string;parent_column:string;deletion:string;updating:string;parent_schema:string;current_schema:string}>`SELECT r.TABLE_NAME AS \`table\`,r.CONSTRAINT_NAME AS name,k.COLUMN_NAME AS \`column\`,k.ORDINAL_POSITION AS position,r.REFERENCED_TABLE_NAME AS parent,k.REFERENCED_COLUMN_NAME AS parent_column,r.DELETE_RULE AS deletion,r.UPDATE_RULE AS updating,k.REFERENCED_TABLE_SCHEMA AS parent_schema,DATABASE() AS current_schema FROM information_schema.REFERENTIAL_CONSTRAINTS r JOIN information_schema.KEY_COLUMN_USAGE k ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME AND k.TABLE_NAME=r.TABLE_NAME WHERE r.CONSTRAINT_SCHEMA=DATABASE() AND r.TABLE_NAME IN (${sql.join(tables)}) ORDER BY r.TABLE_NAME,r.CONSTRAINT_NAME,k.ORDINAL_POSITION`.execute(db);
 const grouped=new Map<string,{table:string;name:string;columns:string[];parent:string;parentColumns:string[];deletion:string;updating:string}>();
 for(const r of rows.rows){if(r.parent_schema!==r.current_schema)throw new Error('Referenced schema mismatch');const id=r.table+'/'+r.name;let item=grouped.get(id);if(!item){item={table:r.table,name:r.name,columns:[],parent:r.parent,parentColumns:[],deletion:r.deletion,updating:r.updating};grouped.set(id,item);}if(Number(r.position)!==item.columns.length+1)throw new Error('Foreign-key ordinal mismatch');item.columns.push(r.column);item.parentColumns.push(r.parent_column);}
 return sortContracts([...grouped.values()]);
}
