import { compileMDX } from 'next-mdx-remote/rsc';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { PostFrontmatter } from '@/types';
import { createMDXComponents } from '@/components/MDXComponents';
import { visit } from 'unist-util-visit';

/**
 * 自定义 remark 插件：将 ==text== 转换为 <mark> 标签
 */
function remarkHighlight() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: any, parent: any) => {
      // 检查是否在代码块中
      if (parent?.type === 'code' || parent?.tagName === 'code') return;

      // 匹配 ==text== 模式
      const regex = /==([^=]+)==/g;
      if (regex.test(node.value)) {
        const children: any[] = [];
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(node.value)) !== null) {
          // 添加匹配前的文本
          if (match.index > lastIndex) {
            children.push({
              type: 'text',
              value: node.value.slice(lastIndex, match.index),
            });
          }

          // 添加高亮文本（使用 mark 元素）
          children.push({
            type: 'element',
            tagName: 'mark',
            children: [{ type: 'text', value: match[1] }],
          });

          lastIndex = regex.lastIndex;
        }

        // 添加剩余文本
        if (lastIndex < node.value.length) {
          children.push({
            type: 'text',
            value: node.value.slice(lastIndex),
          });
        }

        // 替换父节点中的文本节点
        parent.children.splice(index, 1, ...children);
        return index + children.length;
      }
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

async function compileMDXInternal(source: string, postPath?: string) {
  // 创建带有 postPath 上下文的 MDX 组件
  const components = createMDXComponents(postPath);

  return await compileMDX<PostFrontmatter>({
    source,
    components,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath, remarkHighlight],
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
