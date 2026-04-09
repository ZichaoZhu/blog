import { compileMDX } from 'next-mdx-remote/rsc';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import type { PostFrontmatter } from '@/types';
import { createMDXComponents } from '@/components/MDXComponents';
import { visit } from 'unist-util-visit';

/**
 * Typora 扩展行内语法 → JSX 元素映射:
 *   - ==高亮==  →  <mark>高亮</mark>
 *   - ~下标~    →  <sub>下标</sub>
 *   - ^上标^    →  <sup>上标</sup>
 *
 * 必须用 `mdxJsxTextElement` (MDX 行内 JSX 节点),不能用 hast 风格的
 * `{type:'element', tagName:...}` —— 那是 rehype 格式,MDX 会 fallback 成块级 div,
 * 导致 `<p><div>` 嵌套引发 hydration error。
 *
 * 内容里不能含空白和该分隔符自身,以免误匹配 `~/path/to/file~` 之类。
 */
// 注意:GFM 的 ~~删除线~~ 由 remark-gfm 提前处理掉,所以 ~ 规则只需要避开 `~~` 边界
// 即可。要求 ~/^ 内部不含空白和分隔符自身,以避免误匹配 `~/path/file~` 之类。
const TYPORA_INLINE_RULES = [
  { regex: /==([^=\s][^=]*?[^=\s]|[^=\s])==/g, name: 'mark' },
  { regex: /(?<!~)~([^~\s][^~]*?[^~\s]|[^~\s])~(?!~)/g, name: 'sub' },
  { regex: /(?<!\^)\^([^\^\s][^\^]*?[^\^\s]|[^\^\s])\^(?!\^)/g, name: 'sup' },
] as const;

/**
 * 把 ```mermaid 代码块替换成 <Mermaid chart="..." /> JSX,
 * 这样 rehype-pretty-code 就不会再把它当代码语法高亮。
 */
function remarkMermaid() {
  return (tree: any) => {
    visit(tree, 'code', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (node.lang !== 'mermaid') return;
      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'chart', value: node.value },
        ],
        children: [],
      });
    });
  };
}

/**
 * Obsidian 风格 callout / admonition 语法:
 *
 *   > [!note] 标题        ← 普通提示块
 *   > 内容
 *
 *   > [!note]- 标题       ← 可折叠,默认收起
 *   > 内容
 *
 *   > [!note]+ 标题       ← 可折叠,默认展开
 *   > 内容
 *
 * 关键:保留 blockquote 原始 AST children 作为 Callout 的 children,
 * 这样内部的列表、公式、代码块、图片都能继续被 MDX 正常渲染。
 */
function remarkCallout() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const firstPara = node.children?.[0];
      if (!firstPara || firstPara.type !== 'paragraph') return;

      const firstText = firstPara.children?.[0];
      if (!firstText || firstText.type !== 'text') return;

      const match = firstText.value.match(/^\[!(\w+)\]([+-]?)[ \t]*([^\n]*)/);
      if (!match) return;

      const [fullMatch, rawType, modifier, rawTitle] = match;
      const type = rawType.toLowerCase();
      const title = rawTitle.trim();
      const collapsible = modifier === '+' || modifier === '-';
      const defaultOpen = modifier === '+';

      // 剥离匹配的标记部分,保留后续内容
      firstText.value = firstText.value.slice(fullMatch.length).replace(/^\n/, '');
      if (firstText.value === '') {
        firstPara.children.shift();
        // 顺带去掉紧跟的 soft break
        if (firstPara.children[0]?.type === 'break') firstPara.children.shift();
      }
      if (firstPara.children.length === 0) {
        node.children.shift();
      }

      const attributes: any[] = [
        { type: 'mdxJsxAttribute', name: 'type', value: type },
      ];
      if (title) {
        attributes.push({ type: 'mdxJsxAttribute', name: 'title', value: title });
      }
      if (collapsible) {
        attributes.push({ type: 'mdxJsxAttribute', name: 'collapsible', value: 'true' });
      }
      if (defaultOpen) {
        attributes.push({ type: 'mdxJsxAttribute', name: 'defaultOpen', value: 'true' });
      }

      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes,
        children: node.children,
      });
    });
  };
}

/**
 * Typora 的 [toc] 渲染成文章内嵌目录。
 * 匹配独占一段且只含 `[toc]` (大小写不敏感) 的段落,替换为 <ArticleTOC /> JSX。
 */
function remarkTocPlaceholder() {
  return (tree: any) => {
    visit(tree, 'paragraph', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;
      if (!/^\s*\[toc\]\s*$/i.test(node.children[0].value)) return;
      parent.children.splice(index, 1, {
        type: 'mdxJsxFlowElement',
        name: 'ArticleTOC',
        attributes: [],
        children: [],
      });
    });
  };
}

function remarkTyporaInline() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (parent.type === 'code' || parent.type === 'inlineCode') return;

      // 收集所有规则在当前文本节点上的所有匹配
      type Hit = { start: number; end: number; name: string; inner: string };
      const hits: Hit[] = [];
      for (const { regex, name } of TYPORA_INLINE_RULES) {
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(node.value)) !== null) {
          hits.push({ start: m.index, end: m.index + m[0].length, name, inner: m[1] });
        }
      }
      if (hits.length === 0) return;

      // 按起点排序,丢弃彼此重叠的(后来者优先级更低)
      hits.sort((a, b) => a.start - b.start);
      const accepted: Hit[] = [];
      let cursor = 0;
      for (const h of hits) {
        if (h.start >= cursor) {
          accepted.push(h);
          cursor = h.end;
        }
      }

      const children: any[] = [];
      let lastIndex = 0;
      for (const h of accepted) {
        if (h.start > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, h.start) });
        }
        children.push({
          type: 'mdxJsxTextElement',
          name: h.name,
          attributes: [],
          children: [{ type: 'text', value: h.inner }],
        });
        lastIndex = h.end;
      }
      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

const rehypePrettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  keepBackground: true,

  // 防止空行折叠
  onVisitLine(node: any) {
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
  },

  // 高亮行样式
  onVisitHighlightedLine(node: any) {
    node.properties.className = ['highlighted'];
  },

  // 高亮字符样式
  onVisitHighlightedChars(node: any) {
    node.properties.className = ['highlighted-chars'];
  },
};

// 仅匹配真正的 HTML/JSX 标签开头:<tagname>、<tagname ...>、</tagname>、<!--
// tagname 必须是字母开头,后面只能跟字母数字,且必须以空白/`/`/`>` 收尾。
// 这样 `<segment-number, offset>`、`<>`、`a < b` 等元组/比较写法都会被排除。
const TAG_START = /<(\/?[a-zA-Z][a-zA-Z0-9]*(?=[\s/>])|!--)/g;
const SENTINEL = '\u0000';

/**
 * 根据文章 path 计算它的"图片文件夹":
 *   "Operating_System/Lec0"  → "Operating_System"  (嵌套子文章用父目录)
 *   "hello-world"            → "hello-world"       (顶层文章用自身)
 * 与 components/MDXComponents.tsx 里 createMDXImage 的算法保持一致。
 */
function imageFolderForPost(postPath: string): string {
  const parts = postPath.replace(/^\//, '').split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : parts[0];
}

/**
 * 处理 Typora 等编辑器导出的散装 markdown,使其能被 MDX 编译:
 *
 * 1. 把 raw HTML `<img src="./assets/x.png">` 的相对路径重写为 /api/images/...
 *    —— MDX 的 components.img 覆盖只对 markdown ![]() 生效,对 raw HTML img 无效,
 *    所以必须在源串阶段就把相对路径换掉,否则浏览器会请求 /blog/.../assets/x.png 而 404。
 * 2. 把 `style="zoom:NN%"` 重写成 `width="NN%"` 并剥掉其他 style 字符串属性
 *    —— React JSX 不接受字符串 style,必须是对象;Typora 的 `zoom` 也只在 Webkit 生效。
 * 3. 把不像合法标签开头的 `<` 转义成 `&lt;`(`count <>0`、`<segment, offset>` 等)。
 *
 * 围栏代码块(```)和行内代码(`)内的内容原样保留。
 */
function preprocessMarkdown(source: string, postPath?: string): string {
  const folder = postPath ? imageFolderForPost(postPath) : null;
  const segments = source.split(/(```[\s\S]*?```)/g);
  return segments
    .map((seg, i) => {
      if (i % 2 === 1) return seg;
      const inlineParts = seg.split(/(`[^`\n]*`)/g);
      return inlineParts
        .map((part, j) => {
          if (j % 2 === 1) return part;
          let out = part;
          // raw HTML <img src="./..."> → /api/images/<folder>/...
          if (folder) {
            out = out.replace(
              /(<img\b[^>]*\bsrc=")\.\/([^"]+)"/gi,
              (_m, prefix, rel) => `${prefix}/api/images/${encodeURI(folder)}/${encodeURI(rel)}"`
            );
          }
          out = out
            .replace(/\sstyle="zoom:\s*([\d.]+%?)\s*;?\s*"/gi, ' width="$1"')
            .replace(/\sstyle="[^"]*"/gi, '');
          out = out.replace(TAG_START, SENTINEL + '$1');
          out = out.replace(/</g, '&lt;');
          out = out.replace(new RegExp(SENTINEL, 'g'), '<');
          return out;
        })
        .join('');
    })
    .join('');
}

async function compileMDXInternal(source: string, postPath?: string) {
  const components = createMDXComponents(postPath);
  const sanitizedSource = preprocessMarkdown(source, postPath);

  return await compileMDX<PostFrontmatter>({
    source: sanitizedSource,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [
          // 关掉 GFM 的 singleTilde,把单 ~ 留给我们的 sub 语法;~~strike~~ 仍然有效
          [remarkGfm, { singleTilde: false }],
          remarkMath,
          remarkEmoji,
          remarkMermaid,
          remarkCallout,
          remarkTocPlaceholder,
          remarkTyporaInline,
        ],
        rehypePlugins: [
          rehypeKatex,
          rehypeSlug,
          [rehypePrettyCode, rehypePrettyCodeOptions],
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'wrap',
              properties: {
                className: ['anchor'],
              },
            },
          ],
        ],
      },
    },
  });
}

// Export the compilation function directly
// Note: React elements cannot be cached with unstable_cache
export async function compileMDXContent(source: string, postPath?: string) {
  return await compileMDXInternal(source, postPath);
}
