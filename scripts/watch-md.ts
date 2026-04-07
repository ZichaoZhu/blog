#!/usr/bin/env tsx

/**
 * 监视 .md 文件变化并自动同步到 .mdx
 * 
 * 用法：
 *   npm run watch:md
 */

import chokidar from 'chokidar';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content/posts');

console.log('👀 开始监视 .md 文件变化...\n');
console.log(`📂 监视目录: ${CONTENT_DIR}`);
console.log('💡 提示: 按 Ctrl+C 停止监视\n');

// 创建监视器
const watcher = chokidar.watch('**/*.md', {
  cwd: CONTENT_DIR,
  persistent: true,
  ignoreInitial: true, // 忽略初始扫描
  awaitWriteFinish: {  // 等待写入完成
    stabilityThreshold: 300,
    pollInterval: 100,
  },
});

// 监听文件变化
watcher
  .on('change', (relativePath) => {
    const fullPath = path.join(CONTENT_DIR, relativePath);
    console.log(`\n📝 检测到变化: ${relativePath}`);
    
    try {
      // 调用同步脚本
      execSync(`tsx scripts/sync-md-to-mdx.ts "${fullPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('❌ 同步失败:', error);
    }
  })
  .on('add', (relativePath) => {
    const fullPath = path.join(CONTENT_DIR, relativePath);
    console.log(`\n➕ 检测到新文件: ${relativePath}`);
    
    try {
      execSync(`tsx scripts/sync-md-to-mdx.ts "${fullPath}"`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('❌ 同步失败:', error);
    }
  })
  .on('error', (error) => {
    console.error('❌ 监视器错误:', error);
  });

console.log('✅ 监视器已启动\n');
