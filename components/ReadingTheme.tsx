'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { FileText, Newspaper } from 'lucide-react';

/**
 * 阅读主题:与 next-themes 的明暗切换正交。
 * - 'default': 使用站点 prose 样式
 * - 'latex'  : 使用 LaTeX 论文风(app/latex-theme.css)
 *
 * 暗色变体由 .dark .theme-latex 自动级联,无需在此处理。
 */
export type ReadingTheme = 'default' | 'latex';

const STORAGE_KEY = 'reading-theme';

interface Ctx {
  theme: ReadingTheme;
  setTheme: (t: ReadingTheme) => void;
  mounted: boolean;
}

const ReadingThemeCtx = createContext<Ctx>({
  theme: 'default',
  setTheme: () => {},
  mounted: false,
});

export function ReadingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ReadingTheme>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'latex' || saved === 'default') setThemeState(saved);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: ReadingTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ReadingThemeCtx.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ReadingThemeCtx.Provider>
  );
}

/**
 * 包裹文章正文,根据当前 reading theme 切换 className。
 * - default: 站点统一的 Tailwind prose 样式
 * - latex  : .theme-latex 接管全部排版
 */
export function ArticleBody({ children }: { children: ReactNode }) {
  const { theme, mounted } = useContext(ReadingThemeCtx);

  // SSR 与首屏 hydration 时统一渲染 default,避免样式闪烁不一致
  const useLatex = mounted && theme === 'latex';

  return (
    <div
      className={
        useLatex ? 'theme-latex' : 'prose prose-lg dark:prose-invert max-w-none'
      }
    >
      {children}
    </div>
  );
}

/** 浮动在右下角(BackToTop 之上)的主题切换按钮 */
export function ReadingThemeToggle() {
  const { theme, setTheme, mounted } = useContext(ReadingThemeCtx);

  if (!mounted) return null;

  const isLatex = theme === 'latex';
  const next: ReadingTheme = isLatex ? 'default' : 'latex';
  const label = isLatex ? '切换到默认主题' : '切换到 LaTeX 论文主题';
  const Icon = isLatex ? FileText : Newspaper;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className="
        fixed bottom-24 right-8 z-40 p-3 rounded-full
        bg-background border border-border shadow-lg
        text-foreground/80 hover:text-foreground
        hover:shadow-xl transition-all
      "
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
