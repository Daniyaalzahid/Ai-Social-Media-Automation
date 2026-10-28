import { createDatabase } from '../src/server/db/connection.ts';
import { resolveDatabaseConfiguration } from '../src/server/db/config.ts';
import { configuredMediaStorage } from '../src/server/media/configured-storage.ts';
import { createMediaService } from '../src/server/media/service.ts';
import { sql } from 'kysely';
import { createHash } from 'node:crypto';
// OS/SSH/cron access is the administrative boundary. No browser endpoint or human cleanup role.
try {
 const configuration=resolveDatabaseConfiguration(process.env);
 if(process.argv.length!==3||process.argv[2]!==`--environment=${configuration.mode}`)throw new Error();
 const storage=configuredMediaStorage(process.env),handle=createDatabase(configuration);
 try{
  await handle.db.connection().execute(async(connection)=>{
   const identity=(await sql`SELECT DATABASE() AS name,CURRENT_USER() AS account`.execute(connection)).rows[0];
   if(identity?.name!==configuration.database||identity?.account.split('@')[0]!==configuration.user)throw new Error();
   // Reuse MySQL's session advisory locks: one schema-scoped CLI run across
   // processes and deployments, independent of release paths or filesystem locks.
   const lock='bsa/media-cleanup/'+createHash('sha256').update(configuration.database).digest('hex').slice(0,40);
   const acquired=(await sql`SELECT GET_LOCK(${lock},0) AS acquired`.execute(connection)).rows[0]?.acquired;
   if(acquired===0){console.log(JSON.stringify({skipped:true,reason:'cleanup_already_running'}));return;}
   if(acquired!==1)throw new Error();
   try{
    const result=await createMediaService(connection,storage).cleanup();
    console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
   }finally{
    const released=(await sql`SELECT RELEASE_LOCK(${lock}) AS released`.execute(connection)).rows[0]?.released;
    if(released!==1){console.error('Media cleanup lock release unavailable.');process.exitCode=1;}
   }
  });
 }finally{await handle.close();}
}catch{console.error('Media cleanup unavailable; check private configuration and storage permissions.');process.exitCode=1;}
