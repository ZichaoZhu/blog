'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// 围绕点击点散开的 6 颗小粒子方向
const PARTICLE_ANGLES = [0, 60, 120, 180, 240, 300];

export function ClickEffect() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextId = 0;

    const handleClick = (e: MouseEvent) => {
      // 忽略非主键点击
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
      <AnimatePresence>
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute"
            style={{ left: ripple.x, top: ripple.y }}
          >
            {/* 扩散光环 */}
            <motion.span
              initial={{ width: 0, height: 0, opacity: 0.6 }}
              animate={{ width: 80, height: 80, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute rounded-full border-2 border-primary"
              style={{
                left: '50%',
                top: '50%',
                translate: '-50% -50%',
              }}
            />

            {/* 散开的小粒子 */}
            {PARTICLE_ANGLES.map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const distance = 28;
              return (
                <motion.span
                  key={angle}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(rad) * distance,
                    y: Math.sin(rad) * distance,
                    opacity: 0,
                    scale: 0.3,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute h-1.5 w-1.5 rounded-full bg-primary"
                  style={{
                    left: '50%',
                    top: '50%',
                    translate: '-50% -50%',
                  }}
                />
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
