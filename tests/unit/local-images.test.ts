import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createMarkdownProcessor} from '@astrojs/markdown-remark';
import {fromHtml} from 'hast-util-from-html';
import {visit} from 'unist-util-visit';
import rehypeFigure from '../../src/plugins/rehype-figure.mjs';
import {resolveLocalImage,remarkLocalImages} from '../../src/plugins/remark-local-images';
test('local names decode once and filesystem escapes are rejected',async()=>{
 const root=await mkdtemp(join(tmpdir(),'firefly-images-'));const content=join(root,'posts'),source=join(content,'note.md');
 try{
  await mkdir(join(content,'assets'),{recursive:true});
  for(const name of ['图 a+b.png','literal%.png','percent%20.png'])await writeFile(join(content,'assets',name),'image');
  assert.equal(resolveLocalImage('./assets/%E5%9B%BE%20a%2Bb.png',source,content),join(content,'assets/图 a+b.png'));
  assert.equal(resolveLocalImage('./assets/literal%.png',source,content),join(content,'assets/literal%.png'));
  assert.equal(resolveLocalImage('./assets/percent%2520.png',source,content),join(content,'assets/percent%20.png'));
  assert.throws(()=>resolveLocalImage('../../outside.png',source,content),/outside|escape/);
  assert.throws(()=>resolveLocalImage('./assets/missing.png',source,content),/missing/);
  await writeFile(join(root,'outside.png'),'image');await symlink(join(root,'outside.png'),join(content,'assets/link.png'));
  assert.throws(()=>resolveLocalImage('./assets/link.png',source,content),/outside|escape/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('HTML img becomes an optimizable image retaining zoom and original access',async()=>{
 const root=await mkdtemp(join(tmpdir(),'firefly-htmlimg-'));
 try{
  await writeFile(join(root,'图 a+(2).png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'));
  const renderer=await createMarkdownProcessor({remarkPlugins:[[remarkLocalImages,{contentRoot:root,originalsRoot:join(root,'public')}]],rehypePlugins:[rehypeFigure]});
  const result=await renderer.render('<img src="./图 a+(2).png" alt="示意" style="zoom:50%">',{fileURL:new URL('file://'+join(root,'note.md'))});
  let imageProps:Record<string,unknown>|undefined;
  visit(fromHtml(result.code,{fragment:true}),'element',node=>{
   const key=Object.keys(node.properties).find(k=>k.toLowerCase()==='__astro_image_');
   if(key)imageProps=JSON.parse(String(node.properties[key]));
  });
  const legacy=await renderer.render('![思维导图](./图 a+(2).png)',{fileURL:new URL('file://'+join(root,'note.md'))});assert.deepEqual(legacy.metadata.localImagePaths,['图 a+(2).png']);
  assert.equal(imageProps?.['data-source-asset'],'图 a+(2).png');assert.equal(imageProps?.style,'zoom:50%');
  assert.match(result.code,/<figure>/);assert.doesNotMatch(result.code,/<center|<p><a[^>]*><figure/);assert.match(result.code,/href="\/images\/original\//);assert.deepEqual(result.metadata.localImagePaths,['图 a+(2).png']);
 }finally{await rm(root,{recursive:true,force:true});}
});
