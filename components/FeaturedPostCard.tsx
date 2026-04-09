'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowUpRight, Clock, FileText } from 'lucide-react';
import type { Post } from '@/types';

export type PostCardVariant = 'hero' | 'grid' | 'list';

interface FeaturedPostCardProps {
  post: Post;
  /**
   * 卡片变体:
   * - 'hero': 首页最新文章,3D 鼠标跟随倾斜 + 大尺寸内容预览(最豪华)
   * - 'grid': 列表页的网格项,玻璃 + hover 光斑,无 3D 倾斜(减少视觉疲劳)
   * - 'list': 单行横向长卡片,用于 ListLayout 场景
   */
  variant?: PostCardVariant;
}

/**
 * 统计中文字符 + 英文单词数,与 Typora/Markdown 常见"字数"算法一致。
 */
function countWords(content: string): number {
  const chinese = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const english = content.match(/[a-zA-Z]+/g)?.length ?? 0;
  return chinese + english;
}

/** 取前几行正文作预览,剥掉 markdown 语法干扰 */
function extractPreview(content: string, maxLines = 4): string[] {
  const lines = content
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (t.startsWith('#')) return false;
      if (t.startsWith('```')) return false;
      if (t.startsWith('---')) return false;
      if (t.startsWith('![')) return false;
      if (t.startsWith('<img')) return false;
      return true;
    })
    .map((l) =>
      l
        .replace(/^[\s\-*+]+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/==([^=]+)==/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
    )
    .filter((l) => l.length > 0);

  return lines.slice(0, maxLines);
}

/** 根据 frontmatter / 父文件夹推导系列标签 */
function seriesLabel(post: Post): string {
  const cat = post.frontmatter.category;
  if (cat && cat !== '未分类') return cat;
  return post.parentPath?.replace(/_/g, ' ') ?? '未分类';
}

function FeaturedPostCardInner({ post, variant = 'hero' }: FeaturedPostCardProps) {
  if (variant === 'list') {
    return <ListVariant post={post} />;
  }
  return <CardVariant post={post} tilt={variant === 'hero'} />;
}

/**
 * 用 memo 包一层,防止筛选切换时所有卡片连锁重渲染。
 * post 对象引用相同就直接跳过 —— 由于 allPosts 是服务端一次性传进来的
 * 稳定引用,筛选后 useMemo 生成的 filteredPosts 里的 post 对象引用不变,
 * memo 能正确命中。
 */
export const FeaturedPostCard = memo(
  FeaturedPostCardInner,
  (prev, next) =>
    prev.post === next.post && prev.variant === next.variant,
);

// ─────────────────────────────────────────────────────────
// 网格/Hero 卡片变体
// ─────────────────────────────────────────────────────────

function CardVariant({ post, tilt }: { post: Post; tilt: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 只有 tilt 模式才算 rotate(省掉一点 spring 计算)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ['8deg', '-8deg']), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ['-8deg', '8deg']), {
    stiffness: 200,
    damping: 20,
  });

  // Hooks 不能有条件调用,所以 glowBg 总是计算,只在 motion 层决定是否应用
  const glowBg = useTransform(
    [mouseX, mouseY],
    ([mx, my]) =>
      `radial-gradient(600px circle at ${((mx as number) + 0.5) * 100}% ${
        ((my as number) + 0.5) * 100
      }%, rgba(99,102,241,0.12), transparent 40%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const words = useMemo(() => countWords(post.content), [post.content]);
  const preview = useMemo(
    () => extractPreview(post.content, tilt ? 4 : 3),
    [post.content, tilt],
  );
  const category = useMemo(() => seriesLabel(post), [post]);

  return (
    <Link href={`/blog/${post.path}`} className={`block ${tilt ? '[perspective:1200px]' : ''}`}>
      <motion.article
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={tilt ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="glass-card group relative h-full min-h-[380px] p-7 overflow-hidden"
      >
        {/* 顶部细高光 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30"
          style={tilt ? { transform: 'translateZ(1px)' } : undefined}
        />

        {/* 鼠标跟随柔光斑 */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: glowBg }}
        />

        {/* 内容层 */}
        <div
          className="relative flex h-full flex-col"
          style={tilt ? { transform: 'translateZ(30px)' } : undefined}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <span className="micro-label">{category}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              点击跳转
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <h3 className="text-2xl md:text-3xl font-bold mb-2 leading-tight text-foreground line-clamp-2">
            {post.frontmatter.title}
          </h3>

          {post.frontmatter.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {post.frontmatter.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              约 {words.toLocaleString()} 字
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {post.readingTime}
            </span>
            <time dateTime={post.frontmatter.date} className="ml-auto">
              {format(new Date(post.frontmatter.date), 'yyyy-MM-dd', { locale: zhCN })}
            </time>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <div className="space-y-1.5 text-[13px] leading-relaxed text-foreground/70">
              {preview.map((line, i) => (
                <p key={i} className="line-clamp-1">
                  {line}
                </p>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/90 dark:from-neutral-900/80 to-transparent" />
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 font-mono text-[11px] text-muted-foreground truncate">
            /blog/{post.path}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// 横向长卡片变体 (List view)
// ─────────────────────────────────────────────────────────

function ListVariant({ post }: { post: Post }) {
  const words = useMemo(() => countWords(post.content), [post.content]);
  const category = useMemo(() => seriesLabel(post), [post]);

  return (
    <Link href={`/blog/${post.path}`} className="block group">
      <article className="glass-card p-5 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 md:items-center">
        {/* 左: 系列/日期竖栏 */}
        <div className="md:w-40 shrink-0 flex md:flex-col gap-3 md:gap-1 md:border-r md:border-border/50 md:pr-5">
          <span className="micro-label">{category}</span>
          <time
            dateTime={post.frontmatter.date}
            className="text-xs text-muted-foreground font-mono"
          >
            {format(new Date(post.frontmatter.date), 'yyyy-MM-dd', { locale: zhCN })}
          </time>
        </div>

        {/* 中: 标题 + 描述 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-bold leading-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {post.frontmatter.title}
          </h3>
          {post.frontmatter.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {post.frontmatter.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              约 {words.toLocaleString()} 字
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {post.readingTime}
            </span>
          </div>
        </div>

        {/* 右: 跳转箭头 */}
        <div className="hidden md:flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
          <ArrowUpRight className="w-4 h-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
        </div>
      </article>
    </Link>
  );
}
