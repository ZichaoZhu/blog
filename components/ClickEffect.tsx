'use client';

import { useEffect, useState } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// 围绕点击点散开的 6 颗小粒子方向
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300];

/**
 * 装饰性点击涟漪 + 散开粒子。使用纯 CSS 动画(@keyframes 见 globals.css),
 * 不引入 framer-motion,以缩减客户端 bundle。
 */
export function ClickEffect() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextId = 0;

    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const id = nextId++;
      setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
      // 动画结束后自动清理,避免数组无限增长
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 700);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute"
          style={{ left: ripple.x, top: ripple.y }}
        >
          {/* 扩散光环 */}
          <span className="click-ripple-ring" />
          {/* 散开的小粒子 */}
          {PARTICLE_ANGLES.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const distance = 28;
            return (
              <span
                key={angle}
                className="click-ripple-particle"
                style={
                  {
                    '--px': `${Math.cos(rad) * distance}px`,
                    '--py': `${Math.sin(rad) * distance}px`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
