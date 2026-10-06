import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {resolveSiteContext} from '../../src/config/siteContext';
test('production cannot silently use preview metadata',()=>{
 assert.throws(()=>resolveSiteContext({SITE_MODE:'production'}),/origin/i);for(const origin of ['https://localhost','https://127.0.0.1','http://blog.example.org','https://blog.example.org/subpath','https://name:pass@blog.example.org'])assert.throws(()=>resolveSiteContext({SITE_MODE:'production',SITE_ORIGIN:origin}),/origin/i);
 assert.equal(resolveSiteContext({SITE_MODE:'preview'}).noindex,true);assert.equal(resolveSiteContext({}).origin.href,'http://127.0.0.1:4321/');assert.equal(resolveSiteContext({SITE_MODE:'production',SITE_ORIGIN:'https://blog.example.org'}).noindex,false);
});
test('Astro configuration reads the same PUBLIC origin as the page build',()=>{
 const result = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '--eval', "import {siteContext} from './src/config/siteContext.ts'; console.log(JSON.stringify({mode:siteContext.mode,origin:siteContext.origin.href,noindex:siteContext.noindex}))"], {
  encoding:'utf8',
  env:{...process.env,SITE_MODE:'preview',SITE_ORIGIN:'http://127.0.0.1:4321',PUBLIC_SITE_MODE:'production',PUBLIC_SITE_ORIGIN:'https://blog.example.org'},
 });
 assert.deepEqual(JSON.parse(result), {mode:'production',origin:'https://blog.example.org/',noindex:false});
});
