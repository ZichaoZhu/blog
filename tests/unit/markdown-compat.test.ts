import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMarkdownProcessor} from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeCallouts from 'rehype-callouts';
import {remarkTyporaCompat} from '../../src/plugins/remark-typora-compat';
test('Typora inline syntax uses AST while math and code stay intact',async()=>{
 const renderer=await createMarkdownProcessor({syntaxHighlight:{type:'none'},remarkPlugins:[remarkTyporaCompat,remarkMath],rehypePlugins:[rehypeKatex,[rehypeCallouts,{theme:'obsidian'}]]});
 const result=await renderer.render(await readFile('tests/fixtures/markdown/compat.md','utf8'));
 assert.match(result.code,/<mark>高亮<\/mark>/);assert.match(result.code,/<sub>2<\/sub>/);assert.match(result.code,/<sup>2<\/sup>/);
 assert.match(result.code,/<code>==代码==<\/code>/);assert.match(result.code,/==不应转换==/);
 assert.match(result.code,/katex/);assert.match(result.code,/<details/);assert.doesNotMatch(result.code,/\[toc\]|<h1/);
 assert.deepEqual(result.metadata.headings.map(h=>h.slug),['重复','重复-1']);
});
