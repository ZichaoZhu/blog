import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Git deployments include every legacy article and image redirect',async()=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 const legacy=JSON.parse(await readFile('src/data/legacy-routes.json','utf8'));
 assert.equal(config.framework,'astro');
 assert.equal(config.outputDirectory,'dist');
 assert.equal(config.trailingSlash,true);
 const redirects=new Map(config.redirects.map(rule=>[rule.source,rule]));
 assert.equal(redirects.size,config.redirects.length,'redirect sources must be unique');
 for(const [path,destination] of Object.entries(legacy.paths)) {
  for(const source of new Set([path,path.endsWith('/')?path:path+'/'])) {
   assert.deepEqual(redirects.get(source),{source,destination,permanent:true},source);
  }
 }
 for(const [path,image] of Object.entries(legacy.images)) {
  const source='/api/images/'+path.replace(/[()]/g,'\\$&');
  assert.deepEqual(redirects.get(source),{source,destination:image.original,permanent:true},path);
 }
});
