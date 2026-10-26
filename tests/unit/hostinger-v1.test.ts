import { expect,it } from 'vitest';
import { createHash } from 'node:crypto';
import { readMigrations } from '../../src/server/db/migrations';
import { admitEngine,engineStatements,engineSummary } from '../../src/server/db/engine';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { productionProvisioningConfiguration } from '../../src/server/db/provision';
import { validateEnvironment } from '../../src/server/config/schema';
const source=()=>{const url=new URL('mysql://127.0.0.1:3306/reviewed_db');url.username='reviewed_user';url.password='synthetic-password';return{APP_ENV:'production',NODE_ENV:'production',DATABASE_URL:url.href,DATABASE_MIGRATION_URL:url.href,HOSTINGER_MANAGED_LOCAL_DB:'true',HOSTINGER_SINGLE_DB_USER_PROVISIONING:'true'};};
it('admits only exact local production transport with retained confirmation',()=>{
 const env=source(),c=resolveDatabaseConfiguration(env);expect(c).toMatchObject({host:'127.0.0.1',port:3306,tls:false,hostingerLocal:true});expect(productionProvisioningConfiguration(env,'--confirm-production-database=reviewed_db')).toEqual(c);
 expect(()=>productionProvisioningConfiguration(env,'--confirm-production-database=other')).toThrow();
 for(const flag of [undefined,'false','TRUE','1','yes',' true','true '])expect(()=>resolveDatabaseConfiguration({...env,HOSTINGER_MANAGED_LOCAL_DB:flag})).toThrow();
 for(const flag of [undefined,'false'])expect(()=>productionProvisioningConfiguration({...env,HOSTINGER_SINGLE_DB_USER_PROVISIONING:flag},'--confirm-production-database=reviewed_db')).toThrow();
});
it.each(['127.0.0.2','192.0.2.1','[::1]','database.example.test','127.0.0.1.evil.example'])('rejects non-exact local host %s',host=>{const env=source(),url=new URL(env.DATABASE_URL);url.hostname=host;expect(()=>resolveDatabaseConfiguration({...env,DATABASE_URL:url.href})).toThrow();});
it.each(['3307','1','65535'])('rejects local port %s',port=>{const env=source(),url=new URL(env.DATABASE_URL);url.port=port;expect(()=>resolveDatabaseConfiguration({...env,DATABASE_URL:url.href})).toThrow();});
it.each([{APP_ENV:'test'},{NODE_ENV:'development'},{APP_ENV:undefined},{NODE_ENV:undefined},{NODE_TLS_REJECT_UNAUTHORIZED:'0'},{DEV_DATABASE_URL:'synthetic'},{TEST_DATABASE_URL:'synthetic'},{DEV_DATABASE_MIGRATION_URL:'synthetic'},{TEST_DATABASE_MIGRATION_URL:'synthetic'},{TEST_DATABASE_RESET_ALLOWED:'1'}])('fails closed on production isolation %#',patch=>{expect(()=>resolveDatabaseConfiguration({...source(),...patch})).toThrow();});
it('retains verified DNS production TLS and rejects query overrides',()=>{const base=source(),url=new URL(base.DATABASE_URL);url.hostname='database.example.test';const env={...base,HOSTINGER_MANAGED_LOCAL_DB:'false',DATABASE_URL:url.href};expect(resolveDatabaseConfiguration(env)).toMatchObject({tls:true});expect(()=>resolveDatabaseConfiguration({...env,DATABASE_URL:env.DATABASE_URL+'?ssl=false'})).toThrow();});
it.each(['10.11.10-MariaDB','11.4.12-MariaDB','11.5.1-MariaDB','11.8.8-MariaDB','11.8.10-MariaDB','11.8.90-MariaDB','11.9.0-MariaDB','12.0.1-MariaDB','5.7.40','8.0.16','unknown','postgresql'])('rejects unreviewed engine %s',v=>expect(()=>admitEngine(v)).toThrow());
it.each(['11.4.13-MariaDB-ubu2404','5.5.5-11.4.13-MariaDB','11.4.14-MariaDB'])('admits reviewed MariaDB line %s',v=>expect(admitEngine(v)).toBe('mariadb'));
it.each(['8.0.17','8.4.4','9.6.0'])('preserves MySQL %s',v=>expect(admitEngine(v)).toBe('mysql'));
it('keeps all 12 canonical identities and only reviewed MariaDB translations',async()=>{
 const entries=await readMigrations();expect(entries).toHaveLength(12);
 for(const e of entries){expect(createHash('sha256').update(e.source).digest('hex')).toBe(e.sha256);expect(engineStatements('mysql',e.name,e.source)).toEqual(e.statements);const maria=engineStatements('mariadb',e.name,e.source).join('\n');expect(maria).not.toMatch(/DROP CHECK|REGEXP_LIKE|JSON_STORAGE_SIZE/);expect(()=>engineStatements('mariadb',e.name,e.source+' ')).toThrow();expect(()=>engineStatements('mariadb','unknown.sql',e.source)).toThrow();if(e.name.startsWith('0002'))expect(maria).toContain('DROP CONSTRAINT users_active_password');if(e.name.startsWith('0008')){expect(maria).toContain('JSON_SCHEMA_VALID');expect(maria).toContain('OCTET_LENGTH(output_json)<=32768');}}
});
it('never treats blank compatibility selectors as optional',()=>{expect(()=>validateEnvironment({APP_ENV:'test',NODE_ENV:'test',HOSTINGER_MANAGED_LOCAL_DB:''})).toThrow();});

it('reports only safe engine metadata, never an arbitrary server banner',()=>{expect(engineSummary('11.4.13-MariaDB-private-server-banner')).toBe('MariaDB 11.4.13');expect(engineSummary('unknown-private-server-banner')).toBe('MySQL/unknown UNKNOWN');});

it('rejects an unknown vendor even if its banner resembles MySQL',()=>{expect(()=>admitEngine('8.4.4','Unreviewed fork')).toThrow();expect(admitEngine('8.4.4','MySQL Community Server - GPL')).toBe('mysql');expect(admitEngine('8.0.46-0ubuntu0.24.04.4','(Ubuntu)')).toBe('mysql');});

it.each(['11.8.9-MariaDB-log','11.8.9-MariaDB-ubu2404','5.5.5-11.8.9-MariaDB'])('admits exact Hostinger release %s',version=>{expect(admitEngine(version)).toBe('mariadb');expect(engineSummary(version)).toBe('MariaDB 11.8.9');});
