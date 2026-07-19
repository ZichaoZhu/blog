'use client';

import { useSyncExternalStore } from 'react';
import { ArrowUp } from 'lucide-react';

function subscribeToScroll(onStoreChange: () => void) {
  let frame = 0;
  const listener = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      onStoreChange();
    });
  };
  window.addEventListener('scroll', listener, { passive: true });
  return () => {
    window.removeEventListener('scroll', listener);
    if (frame) window.cancelAnimationFrame(frame);
  };
}

export function BackToTop() {
  const isVisible = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 300,
    () => false,
  );

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-8 right-8 z-50 inline-flex size-11 items-center justify-center
        rounded-sm border border-border bg-background text-foreground shadow-sm
        hover:border-[var(--academic-link)] hover:text-[var(--academic-link)]
        transition-[opacity,transform,color,border-color] duration-200
        ${isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}
      `}
      aria-label="返回顶部"
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
