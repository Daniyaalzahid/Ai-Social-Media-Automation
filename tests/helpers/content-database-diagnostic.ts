import type { Kysely,DatabaseConnection,CompiledQuery,QueryResult } from 'kysely';
import type { DatabaseSchema } from '../../src/server/db/schema';
/** Bounded test-only DB-boundary evidence. Never retains SQL parameters or rows. */
export function contentDatabaseDiagnostic(db:Kysely<DatabaseSchema>){
 const events:{operation:string;table:string|null;rows:number|null;sequence:number|null;code:string|null;sqlState:string|null}[]=[],executor=db.getExecutor(),provide=executor.provideConnection;
 executor.provideConnection=async<T>(consumer:(connection:DatabaseConnection)=>Promise<T>,options?:Parameters<typeof provide>[1]):Promise<T>=>provide.call(executor,async(connection)=>{
  const execute=connection.executeQuery;
  connection.executeQuery=async<R>(query:CompiledQuery,queryOptions?:Parameters<typeof execute>[1]):Promise<QueryResult<R>>=>{
   const table=query.sql.match(/(?:from|into|update) `(content_[a-z_]+)`/i)?.[1]??null;
   try{const result=await execute.call(connection,query,queryOptions) as QueryResult<R>;if(table){const row=result.rows[0] as {revision_sequence?:unknown}|undefined;events.push({operation:query.sql.split(' ',1)[0]!,table,rows:result.rows.length,sequence:typeof row?.revision_sequence==='number'?row.revision_sequence:null,code:null,sqlState:null});if(events.length>30)events.shift();}return result;}
   catch(e){const v=e as {code?:unknown;sqlState?:unknown};events.push({operation:query.sql.split(' ',1)[0]!,table,rows:null,sequence:null,code:typeof v.code==='string'&&/^[A-Z0-9_]{1,64}$/.test(v.code)?v.code:null,sqlState:typeof v.sqlState==='string'&&/^[A-Z0-9]{5}$/.test(v.sqlState)?v.sqlState:null});if(events.length>30)events.shift();throw e;}
  };
  try{return await consumer(connection);}finally{connection.executeQuery=execute;}
 },options) as T;
 return{report:()=>events.map(e=>({...e})),close:()=>{executor.provideConnection=provide;}};
}
