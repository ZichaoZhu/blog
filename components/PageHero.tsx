'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  /** 小字大写标签,页面系列指示(如 "BLOG" / "ABOUT") */
  eyebrow?: string;
  /** 大标题,支持 string 或自定义节点(用楷体 + 动效) */
  title: ReactNode;
  /** 副标题 */
  subtitle?: ReactNode;
  /** 附加内容,通常是面包屑/筛选器/按钮组,贴在 hero 底部 */
  children?: ReactNode;
  /** 是否用楷体渲染大标题,默认 true */
  kaiti?: boolean;
  /** hero 最小高度,默认 360px */
  minHeight?: string;
  className?: string;
}

/**
 * 二级页面统一 Hero:
 * - 柔和径向光晕背景(indigo + pink)
 * - 大 display 标题,可选楷体
 * - eyebrow 小标签呼应首页卡片的 micro-label 风格
 * - 下方可叠 children(面包屑/筛选/按钮等)
 * - 过渡到下方内容靠底部 gradient 渐隐
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  kaiti = true,
  minHeight = 'min-h-[360px]',
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative flex flex-col items-center justify-center',
        minHeight,
        'px-4 sm:px-6 lg:px-8 py-20 text-center',
        className
      )}
    >
      <div className="glow-bg" aria-hidden />

      {eyebrow && (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="micro-label mb-4"
        >
          {eyebrow}
        </motion.span>
      )}

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className={cn(
          'text-5xl md:text-6xl lg:text-7xl font-bold leading-tight',
          kaiti && 'font-kaiti'
        )}
      >
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-5 max-w-2xl text-base md:text-lg text-muted-foreground"
        >
          {subtitle}
        </motion.p>
      )}

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-8 w-full max-w-5xl"
        >
          {children}
        </motion.div>
      )}

      {/* 底部渐隐过渡到下方 section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background"
      />
    </section>
  );
}
