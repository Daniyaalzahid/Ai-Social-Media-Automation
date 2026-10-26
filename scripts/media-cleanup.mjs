import { createDatabase } from '../src/server/db/connection.ts';
import { resolveDatabaseConfiguration } from '../src/server/db/config.ts';
import { configuredMediaStorage } from '../src/server/media/configured-storage.ts';
import { createMediaService } from '../src/server/media/service.ts';
import { sql } from 'kysely';
// OS/SSH/cron access is the administrative boundary. No browser endpoint or human cleanup role.
try {
 const configuration=resolveDatabaseConfiguration(process.env);
 if(process.argv.length!==3||process.argv[2]!==`--environment=${configuration.mode}`)throw new Error();
 const storage=configuredMediaStorage(process.env),handle=createDatabase(configuration);
 try{
  const identity=(await sql`SELECT DATABASE() AS name,CURRENT_USER() AS account`.execute(handle.db)).rows[0];
  if(identity?.name!==configuration.database||identity?.account.split('@')[0]!==configuration.user)throw new Error();
  const result=await createMediaService(handle.db,storage).cleanup();
  console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
 }finally{await handle.close();}
}catch{console.error('Media cleanup unavailable; check private configuration and storage permissions.');process.exitCode=1;}
