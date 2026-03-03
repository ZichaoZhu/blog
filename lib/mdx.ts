import { compileMDX } from 'next-mdx-remote/rsc';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkGfm from 'remark-gfm';
import type { PostFrontmatter } from '@/types';
import { MDXComponents } from '@/components/MDXComponents';

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

async function compileMDXInternal(source: string) {
  return await compileMDX<PostFrontmatter>({
    source,
    components: MDXComponents,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
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
export async function compileMDXContent(source: string) {
  return await compileMDXInternal(source);
}
