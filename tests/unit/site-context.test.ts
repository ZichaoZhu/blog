import {test} from 'node:test';import assert from 'node:assert/strict';import {resolveSiteContext} from '../../src/config/siteContext';
test('production cannot silently use preview metadata',()=>{
 assert.throws(()=>resolveSiteContext({SITE_MODE:'production'}),/origin/i);for(const origin of ['https://localhost','https://127.0.0.1','http://blog.example.org','https://blog.example.org/subpath','https://name:pass@blog.example.org'])assert.throws(()=>resolveSiteContext({SITE_MODE:'production',SITE_ORIGIN:origin}),/origin/i);
 assert.equal(resolveSiteContext({SITE_MODE:'preview'}).noindex,true);assert.equal(resolveSiteContext({}).origin.href,'http://127.0.0.1:4321/');assert.equal(resolveSiteContext({SITE_MODE:'production',SITE_ORIGIN:'https://blog.example.org'}).noindex,false);
});
