'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface MermaidProps {
  chart: string;
}

/**
 * 客户端渲染 mermaid 图表。
 * 来源:Typora ```mermaid 代码块 → MDX 通过 components.code 路由到此组件。
 *
 * mermaid 是 ~700KB 的客户端依赖,这里用动态 import,只有真正用到的页面才会加载。
 * 跟随 next-themes 切换主题。
 */
export function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme, id]);

  if (error) {
    return (
      <pre className="my-4 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        Mermaid 渲染失败: {error}
        {'\n\n'}
        {chart}
      </pre>
    );
  }

  return <div ref={ref} className="my-6 flex justify-center" />;
}
