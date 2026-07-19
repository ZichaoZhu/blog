'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TypingEffect } from './TypingEffect';

export function AnimatedHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // 视差效果
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);

  return (
    <div ref={containerRef} className="relative h-screen overflow-hidden">
      {/* 层 1: 视频背景 */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>

      {/* 层 2: 暗色蒙版 + 微妙渐变,保证文字可读性 */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      {/* 层 3: 视差内容 */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center h-full px-4"
        style={{ y, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center"
        >
          <TypingEffect
            text="世界は優しい"
            speed={220}
            className="font-kaiti text-6xl md:text-8xl font-normal text-white mb-6 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
            className="font-kaiti text-xl md:text-2xl text-white/90 mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
          >
            世界很温柔，我们都在努力变得更好。
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.4 }}
            className="flex gap-4 justify-center"
          >
            <a
              href="#posts"
              className="px-6 py-3 bg-white/95 text-neutral-900 rounded-lg font-semibold hover:bg-white transition-colors"
            >
              阅读文章
            </a>
            <a
              href="#about"
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/20"
            >
              关于我
            </a>
          </motion.div>
        </motion.div>

        {/* 滚动提示 */}
        <motion.div
          className="absolute bottom-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-white/70 text-sm flex flex-col items-center gap-2"
          >
            <span>向下滚动</span>
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
