import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Post } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 统计中文字符 + 英文单词数,与 Typora/Markdown 常见"字数"算法一致。
 * 在 lib/posts.ts 文章加载阶段就会预计算挂到 post.wordCount 上。
 */
export function countWords(content: string): number {
  const chinese = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0
  const english = content.match(/[a-zA-Z]+/g)?.length ?? 0
  return chinese + english
}

/**
 * 根据 frontmatter / 父文件夹推导"系列"标签:
 * 优先用 frontmatter.category,若是"未分类"就退回父文件夹名。
 */
export function seriesLabel(post: Post): string {
  const cat = post.frontmatter.category
  if (cat && cat !== '未分类') return cat
  return post.parentPath?.replace(/_/g, ' ') ?? '未分类'
}

/** 格式化文章日期,默认 yyyy-MM-dd,可传自定义 pattern */
export function formatPostDate(date: string, pattern: string = 'yyyy-MM-dd'): string {
  return format(new Date(date), pattern, { locale: zhCN })
}
