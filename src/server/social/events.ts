import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/schema.ts';
const kinds=z.enum(['started','completed','failed','destination_changed','reconnected','disconnected','revocation_confirmed','revocation_unconfirmed','refresh_started','refreshed','refresh_failed']);
export async function integrationEvent(db:Kysely<DatabaseSchema>,actor:string|null,kind:z.infer<typeof kinds>,recordId?:string){
 kinds.parse(kind);if(actor!==null)z.uuid().parse(actor);if(recordId!==undefined)z.uuid().parse(recordId);const correlation=randomUUID(),action=`integration.${kind}`,metadata=JSON.stringify({reasonCode:action,...(recordId?{changedFields:[`record:${recordId}`]}:{})});
 await db.insertInto('audit_logs').values({id:randomUUID(),actor_user_id:actor,target_user_id:null,session_id:null,action,outcome:'success',correlation_id:correlation,metadata_safe_json:metadata,ip_hash:null}).execute();
 await db.insertInto('security_events').values({id:randomUUID(),user_id:actor,type:action,severity:kind.includes('failed')?'warning':'info',outcome:kind.includes('failed')?'failure':'success',correlation_id:correlation,metadata_safe_json:metadata,ip_hash:null}).execute();
}
