'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ParticlesLayer } from './ParticlesLayer';
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
      {/* 层 1: 静态渐变背景 */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900"
        style={{ willChange: 'transform' }}
      />
      
      {/* 层 2: 动画渐变叠加 */}
      <motion.div
        className="absolute inset-0"
        style={{
          willChange: 'opacity',
          transform: 'translateZ(0)',
        }}
        animate={{
          background: [
            'linear-gradient(to bottom right, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))',
            'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))',
            'linear-gradient(to bottom right, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2), rgba(236, 72, 153, 0.2))',
          ],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'linear',
        }}
      />
      
      {/* 层 3: 粒子效果 */}
      <ParticlesLayer />
      
      {/* 层 4: 视差内容 */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center h-full px-4"
        style={{ y, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center"
        >
          <TypingEffect 
            text="欢迎来到我的博客" 
            speed={150}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          />
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
            className="text-xl md:text-2xl text-white/90 mb-8"
          >
            分享技术，记录成长
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.5 }}
            className="flex gap-4 justify-center"
          >
            <a
              href="#posts"
              className="px-6 py-3 bg-white text-purple-900 rounded-lg font-semibold hover:bg-white/90 transition-colors"
            >
              阅读文章
            </a>
            <a
              href="#about"
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
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
