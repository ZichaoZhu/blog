import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  compileMDXContent,
  normalizeTyporaImageDestinations,
  renderMarkdown,
} from '@/lib/mdx';
import type { ContentAssetManifest } from '@/lib/assets';

function createManifest(
  sourcePath: string,
  overrides: Partial<ContentAssetManifest['assets'][string]> = {},
): ContentAssetManifest {
  const hash = overrides.hash ?? 'a'.repeat(64);
  const ext = overrides.ext ?? '.png';
  return {
    version: 1,
    assets: {
      [sourcePath]: {
        sourcePath,
        url: `/_content/${hash}${ext}`,
        width: 1600,
        height: 900,
        ext,
        size: 1234,
        hash,
        ...overrides,
      },
    },
  };
}

async function render(source: string, manifest?: ContentAssetManifest) {
  const result = await renderMarkdown({
    source,
    sourceFile: 'topic/note.md',
    assetManifest: manifest,
  });
  return { ...result, html: renderToStaticMarkup(<>{result.content}</>) };
}

describe('renderMarkdown', () => {
  it('renders Typora inline syntax, GFM and math without executable MDX', async () => {
    const { html, features } = await render(`
## 基础

==高亮== H~2~O x^2^ ~~删除~~ {window.alert('x')}

- [x] 完成

脚注[^a]

[^a]: 脚注内容

$x^2$
`);

    expect(html).toContain('<mark>高亮</mark>');
    expect(html).toContain('H<sub>2</sub>O');
    expect(html).toContain('x<sup>2</sup>');
    expect(html).toContain('<del>删除</del>');
    expect(html).toContain('{window.alert(&#x27;x&#x27;)}');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="已完成任务"');
    expect(html).toContain('data-footnote-ref');
    expect(html).toContain('id="user-content-fn-a"');
    expect(html).toContain('href="#user-content-fn-a"');
    expect(html).toContain('id="user-content-fnref-a"');
    expect(html).toContain('href="#user-content-fnref-a"');
    expect(html).toContain('class="katex"');
    expect(features.math).toBe(true);
  });

  it('builds duplicate heading ids and inline TOC from the same AST', async () => {
    const { html, toc } = await render(`
[toc]

## 结果

### 细节

## 结果
`);

    expect(toc).toEqual([
      { id: 'section-结果', title: '结果', level: 2 },
      { id: 'section-细节', title: '细节', level: 3 },
      { id: 'section-结果-1', title: '结果', level: 2 },
    ]);
    expect(html).toContain('aria-label="文章目录"');
    expect(html).toContain('href="#section-结果-1"');
    expect(html).toContain('id="section-结果-1"');
  });

  it('supports official and collapsible callouts plus Mermaid', async () => {
    const { html } = await render(`
> [!IMPORTANT] 实验结论
> 需要复核。

> [!note]- 补充
> 默认折叠。

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`);

    expect(html).toContain('callout-important');
    expect(html).toContain('实验结论');
    expect(html).toContain('<details');
    expect(html).toContain('补充');
    expect(html).toContain('my-6 flex justify-center');
  });

  it('rewrites local images through the manifest and sanitizes raw HTML', async () => {
    const sourcePath = 'content/posts/topic/assets/图 1.png';
    const manifest = createManifest(sourcePath);

    const { html, diagnostics } = await render(
      `<img src="./assets/%E5%9B%BE%201.png" alt="结果" style="zoom:50%;" onerror="alert(1)" />\n\n<script>alert(2)</script>`,
      manifest,
    );

    expect(html).toContain(`${'a'.repeat(64)}.png`);
    expect(html).toContain('width:50%');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<script');
    expect(diagnostics).toContainEqual(expect.objectContaining({ severity: 'warning' }));
  });

  it('normalizes Typora image destinations with spaces and parentheses outside code', async () => {
    const sourcePath = 'content/posts/topic/assets/NotebookLM Mind Map (2).png';
    const manifest = createManifest(sourcePath, { hash: 'b'.repeat(64) });
    const source = [
      '![图](./assets/NotebookLM Mind Map (2).png)',
      '',
      '`![inline](./assets/NotebookLM Mind Map (2).png)`',
      '',
      '```md',
      '![fenced](./assets/NotebookLM Mind Map (2).png)',
      '```',
    ].join('\n');

    const { html, diagnostics } = await render(source, manifest);
    expect(html).toContain(`${'b'.repeat(64)}.png`);
    expect(html).toContain('alt="图"');
    expect(html).toContain('<code>![inline](./assets/NotebookLM Mind Map (2).png)</code>');
    expect(html).toContain('fenced');
    expect(html).not.toContain('alt="fenced"');
    expect(diagnostics).toEqual([]);
  });

  it('normalizes balanced destinations and titles while preserving existing CommonMark forms', () => {
    expect(
      normalizeTyporaImageDestinations(
        'before ![a [nested]](./A Folder/file (copy).png "Figure 1") after',
      ),
    ).toBe(
      'before ![a [nested]](<./A Folder/file (copy).png> "Figure 1") after',
    );
    expect(
      normalizeTyporaImageDestinations(
        "![a](./A Folder/file.png 'single title')\n![b](<./already wrapped.png>)\n![c](./simple.png)",
      ),
    ).toBe(
      "![a](<./A Folder/file.png> 'single title')\n![b](<./already wrapped.png>)\n![c](./simple.png)",
    );
    expect(normalizeTyporaImageDestinations('`![x](a b.png)`')).toBe(
      '`![x](a b.png)`',
    );
    expect(normalizeTyporaImageDestinations('``unclosed ![x](a b.png)')).toBe(
      '``unclosed ![x](a b.png)',
    );
    expect(normalizeTyporaImageDestinations('![broken](a b.png')).toBe(
      '![broken](a b.png',
    );
    expect(normalizeTyporaImageDestinations('![broken alt(a b.png)')).toBe(
      '![broken alt(a b.png)',
    );
  });

  it('tracks both backtick and tilde fences without changing image-like code', () => {
    const source = [
      '````markdown',
      '![one](a b.png)',
      '```',
      '![two](c d.png)',
      '````',
      '~~~md',
      '![three](e f.png)',
      '~~~',
      '![real](g h.png)',
    ].join('\n');
    const normalized = normalizeTyporaImageDestinations(source);

    expect(normalized).toContain('![one](a b.png)');
    expect(normalized).toContain('![two](c d.png)');
    expect(normalized).toContain('![three](e f.png)');
    expect(normalized).toContain('![real](<g h.png>)');
  });

  it('filters dangerous tags, attributes and protocols while retaining safe Typora HTML', async () => {
    const { html, diagnostics } = await render(`
<script>alert(1)</script>
<iframe src="https://evil.example"></iframe>
<object data="bad"><embed src="bad"></object>
<div onclick="alert(2)" style="color:red">safe text</div>
<a href="javascript:alert(3)" onmouseover="bad()">unsafe link</a>
<details open><summary>展开</summary><u>下划线</u> <kbd>Ctrl</kbd> <mark>标记</mark> H<sub>2</sub> x<sup>2</sup></details>
<video controls preload="metadata" poster="https://cdn.example/poster.webp" src="https://cdn.example/video.mp4"><source src="https://cdn.example/video.webm" type="video/webm"></video>
<video poster="javascript:alert(4)" src="https://cdn.example/safe.mp4"></video>
`);

    expect(html).not.toMatch(/<(?:script|iframe|object|embed)\b/);
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onmouseover');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('style="color:red"');
    expect(html).toContain('<details');
    expect(html).toContain('<summary>展开</summary>');
    expect(html).toContain('<u>下划线</u>');
    expect(html).toContain('<kbd>Ctrl</kbd>');
    expect(html).toContain('<video');
    expect(html).toContain('poster="https://cdn.example/poster.webp"');
    expect(html).not.toContain('poster="javascript:');
    expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    expect(diagnostics.every((item) => item.file === 'topic/note.md')).toBe(true);
  });

  it('diagnoses only missing relative content images and leaves public/external images alone', async () => {
    const emptyManifest: ContentAssetManifest = { version: 1, assets: {} };
    const { html, diagnostics } = await render(`
![missing](./assets/missing.png)

![public](/logo.svg)

![remote](https://images.example/remote.png)
`, emptyManifest);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        file: 'topic/note.md',
        message: '未找到本地图片: ./assets/missing.png',
      }),
    ]);
    expect(html).toContain('src="./assets/missing.png"');
    expect(html).toContain('src="/logo.svg"');
    expect(html).toContain('src="https://images.example/remote.png"');
  });

  it('creates captioned figures and preserves requested Typora display width', async () => {
    const sourcePath = 'content/posts/topic/assets/result.svg';
    const manifest = createManifest(sourcePath, {
      hash: 'c'.repeat(64),
      ext: '.svg',
      url: `/_content/${'c'.repeat(64)}.svg`,
      width: 640,
      height: 480,
    });
    const { html } = await render(
      [
        '![结果](./assets/result.svg "Figure 1")',
        '',
        '<img src="./assets/result.svg" alt="缩放结果" style="zoom:62.5%;" />',
      ].join('\n'),
      manifest,
    );

    expect(html).toContain('<figure class="article-figure">');
    expect(html).toContain('<figcaption>Figure 1</figcaption>');
    expect(html).toContain('width:62.5%');
    expect(html).toContain(`${'c'.repeat(64)}.svg`);
  });

  it('supports open, default and unknown callouts while leaving ordinary quotes intact', async () => {
    const { html } = await render(`
> 普通引用

> **强调开头**

> [!TIP]+ 默认展开
> 正文

> [!mystery]
> 未知类型

> [!NOTE] 同行正文
`);

    expect(html).toMatch(/<blockquote>\s*<p>普通引用<\/p>\s*<\/blockquote>/);
    expect(html).toMatch(
      /<blockquote>\s*<p><strong>强调开头<\/strong><\/p>\s*<\/blockquote>/,
    );
    expect(html).toMatch(/<details[^>]*callout-tip[^>]*open=""/);
    expect(html).toContain('默认展开');
    expect(html).toContain('callout-note');
    expect(html).toContain('同行正文');
  });

  it('handles TOC bounds, placeholders and uppercase Mermaid without changing ordinary code', async () => {
    const { html, toc } = await render(`
# 一级
## 二级
#### 四级
##### 五级

[TOC]

[toc] 不是占位符

\`\`\`MERMAID
flowchart LR
  A --> B
\`\`\`

\`\`\`text
plain
\`\`\`
`);

    expect(toc).toEqual([
      { id: 'section-二级', title: '二级', level: 2 },
      { id: 'section-四级', title: '四级', level: 4 },
    ]);
    expect(html).toContain('aria-label="文章目录"');
    expect(html).toContain('[toc] 不是占位符');
    expect(html).toContain('my-6 flex justify-center');
    expect(html).toContain('plain');
  });

  it('highlights code lines and characters and preserves empty lines', async () => {
    const { html } = await render(`
\`\`\`js {1} /token/
const token = 1;

\`\`\`
`);

    expect(html).toContain('class="highlighted"');
    expect(html).toContain('class="highlighted-chars"');
    expect(html).toContain('data-line');
  });

  it('renders tables, emoji, display math and the compatibility entry point', async () => {
    const source = `
| A | B |
|---|---|
| 1 | 2 |

:smile:

$$
x = y
$$
`;
    const { html } = await render(source);
    const legacy = await compileMDXContent(source);
    const legacyHtml = renderToStaticMarkup(<>{legacy.content}</>);

    expect(html).toContain('aria-label="可滚动表格"');
    expect(html).toContain('😄');
    expect(html).toContain('class="katex-display"');
    expect(legacyHtml).toContain('<table>');
  });

  it('does not convert invalid or whitespace-delimited Typora inline markers', async () => {
    const { html } = await render(
      'prefix ==mark== suffix == spaced == ~ sub ~ ^ sup ^ ==outer ~inner~== plain',
    );

    expect(html).toContain('prefix <mark>mark</mark> suffix');
    expect(html).toContain('== spaced ==');
    expect(html).toContain('~ sub ~');
    expect(html).toContain('^ sup ^');
    expect(html).toContain('<mark>outer ~inner~</mark>');
  });

  it('clobber-prefixes untrusted raw IDs while keeping generated section IDs stable', async () => {
    const { html, toc } = await render(`
<h2 id="main-content">Raw heading</h2>

## Trusted heading
`);

    expect(html).toContain('id="user-content-main-content"');
    expect(html).not.toContain('id="main-content"');
    expect(html).toContain('id="section-trusted-heading"');
    expect(toc).toEqual([
      { id: 'section-trusted-heading', title: 'Trusted heading', level: 2 },
    ]);
  });
});
