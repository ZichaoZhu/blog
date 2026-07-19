import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  kaiti?: boolean;
  minHeight?: string;
  className?: string;
}

/**
 * 二级页面的紧凑标题区。使用普通文档流与细分隔线，避免营销页式大幅 Hero。
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  kaiti = false,
  minHeight = 'min-h-[260px]',
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'flex items-center border-b border-border px-4 py-12 sm:px-6 lg:px-8',
        minHeight,
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">
        {eyebrow && <p className="micro-label mb-4">{eyebrow}</p>}

        <h1
          className={cn(
            'max-w-4xl text-balance text-4xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl',
            kaiti && 'font-kaiti',
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <div className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {subtitle}
          </div>
        )}

        {children && <div className="mt-8 max-w-5xl">{children}</div>}
      </div>
    </section>
  );
}
