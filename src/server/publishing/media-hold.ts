import type { Kysely } from 'kysely';
import type { DatabaseSchema } from '../db/schema';
/** Caller owns media guard + asset row; snapshot/history alone never retains bytes. */
export async function activePublishHold(tx:Kysely<DatabaseSchema>,mediaId:string,now:Date){
 return tx.selectFrom('publish_assets as a').innerJoin('publish_operations as o','o.id','a.snapshot_id').select('a.snapshot_id').where('a.media_id','=',mediaId).where('a.protected_until','>',now).where('o.state','in',['CREATED','DISPATCHING','ACCEPTED','PROCESSING','UNKNOWN']).limit(1).executeTakeFirst();
}
