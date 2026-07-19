'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
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
const CHANGE_EVENT = 'reading-theme-change';

const subscribeToTheme = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
};

const getThemeSnapshot = (): ReadingTheme => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'latex' ? 'latex' : 'default';
};

const getServerThemeSnapshot = (): ReadingTheme => 'default';
const subscribeToHydration = () => () => {};

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
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );

  const setTheme = useCallback((t: ReadingTheme) => {
    localStorage.setItem(STORAGE_KEY, t);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  useEffect(() => {
    if (theme !== 'latex' || document.getElementById('reading-theme-styles')) return;
    const stylesheet = document.createElement('link');
    stylesheet.id = 'reading-theme-styles';
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/reading-theme.css';
    document.head.append(stylesheet);
  }, [theme]);

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
      className={`prose prose-lg dark:prose-invert max-w-none ${
        useLatex ? 'theme-latex' : ''
      }`}
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
        fixed bottom-24 right-8 z-40 inline-flex size-11 items-center justify-center rounded-sm
        bg-background border border-border shadow-sm
        text-foreground/80 hover:text-foreground
        hover:border-[var(--academic-link)] hover:text-[var(--academic-link)]
        transition-[color,border-color] duration-200
      "
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}
