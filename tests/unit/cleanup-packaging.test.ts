import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('keeps cleanup packaging and isolated production-artifact validation mandatory',()=>{
 const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
 expect(scripts.postbuild).toBe('node scripts/package-media-cleanup.mjs');
 expect(scripts['test:production-cleanup']).toBe('node --experimental-transform-types --test tests/production/cleanup.test.mjs');
 const workflow=readFileSync('.github/workflows/ci.yml','utf8');
 expect(workflow).toContain('--test tests/production/cleanup.test.mjs');
});
it.each(['--environment=production','--environment=development','--environment=test'])('source CLI rejects incomplete configuration safely: %s',argument=>{
 const marker='PUBLIC_CLEANUP_CONFIG_CANARY';
 const result=spawnSync(process.execPath,['--experimental-transform-types','scripts/media-cleanup.mjs',argument],{env:{APP_ENV:'test',NODE_ENV:'test',TEST_DATABASE_URL:marker},encoding:'utf8',timeout:15000});
 expect(result.status).toBe(1);expect(result.stdout).toBe('');
 expect(result.stderr).toContain('Media cleanup unavailable; check private configuration and storage permissions.');
 expect(result.stderr).not.toContain(marker);expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
});
