/** Test-only normalization. Driver messages and SQL/parameter values never leave this module. */
export const PUBLISH_CONSTRAINT_NAMES=Object.freeze([
 'publish_snapshot_ids','publish_snapshot_binding','publish_snapshot_value','publish_snapshot_confirmation',
 'publish_operation_bounds','publish_operation_dispatch','publish_event_bounds','publish_event_references','publish_event_outcome',
 'publish_asset_ids','publish_asset_value','publish_asset_hold',
 'publish_snapshot_brand_fk','publish_snapshot_revision_fk','publish_snapshot_variant_fk','publish_snapshot_decision_fk',
 'publish_snapshot_actor_fk','publish_snapshot_authorization_fk','publish_snapshot_destination_fk',
 'publish_operation_snapshot_fk','publish_event_operation_fk','publish_asset_snapshot_fk','publish_asset_revision_fk',
] as const);
type Constraint=typeof PUBLISH_CONSTRAINT_NAMES[number];
const CODES=Object.freeze(['ER_CHECK_CONSTRAINT_VIOLATED','ER_NO_REFERENCED_ROW_2','ER_ROW_IS_REFERENCED_2','ER_BAD_NULL_ERROR','ER_DATA_TOO_LONG','WARN_DATA_TRUNCATED','ER_DUP_ENTRY'] as const);
type Code=typeof CODES[number]|'UNKNOWN_DATABASE_ERROR';
export type PublishingDatabaseDiagnostic={accepted:boolean;code:Code|null;constraint:Constraint|null};
function dataProperty(error:object,key:string):unknown{return Object.getOwnPropertyDescriptor(error,key)?.value;}
export function publishingDatabaseDiagnostic(error:unknown):PublishingDatabaseDiagnostic{
 const safe:PublishingDatabaseDiagnostic={accepted:false,code:'UNKNOWN_DATABASE_ERROR',constraint:null};
 try{
  if(error===null||typeof error!=='object')return safe;
  const code=dataProperty(error,'code');safe.code=CODES.find(known=>known===code)??'UNKNOWN_DATABASE_ERROR';
  const message=dataProperty(error,'sqlMessage');if(typeof message!=='string'||message.length>4096)return safe;
  let candidate:string|undefined;
  if(safe.code==='ER_CHECK_CONSTRAINT_VIOLATED')candidate=/^Check constraint '([^'\r\n]{1,128})' is violated\.$/.exec(message)?.[1];
  else if((safe.code==='ER_NO_REFERENCED_ROW_2'||safe.code==='ER_ROW_IS_REFERENCED_2')&&/^Cannot (?:add or update a child row|delete or update a parent row): a foreign key constraint fails \(/.test(message)){
   // MySQL names the table before this marker. Only one explicit CONSTRAINT ... FOREIGN KEY clause is accepted.
   const clauses=[...message.matchAll(/\bCONSTRAINT `([^`\r\n]{1,128})` FOREIGN KEY\b/g)];
   if(clauses.length===1)candidate=clauses[0]![1];
  }
  safe.constraint=PUBLISH_CONSTRAINT_NAMES.find(known=>known===candidate)??null;
  return safe;
 }catch{return{accepted:false,code:'UNKNOWN_DATABASE_ERROR',constraint:null};}
}
export async function observePublishingWrite(work:()=>Promise<unknown>):Promise<PublishingDatabaseDiagnostic>{
 try{await work();return{accepted:true,code:null,constraint:null};}catch(error){return publishingDatabaseDiagnostic(error);}
}
