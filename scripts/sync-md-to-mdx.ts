#!/usr/bin/env tsx

/**
 * 同步 .md 文件到博客格式
 *
 * 目标目录结构:
 *   posts/
 *   ├── Lec0/
 *   │   ├── assets/
 *   │   │   ├── figure1.png
 *   │   │   └── figure2.png
 *   │   ├── index.md
 *   │   └── .folder.json
 *
 * 用法：
 *   npm run sync:md             # 同步所有 .md 文件
 *   npm run sync:md Lec0.md     # 同步指定文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../content/posts');

interface FrontmatterData {
  title: string;
  date: string;
  description: string;
  tags: string[];
  category: string;
  author: string;
  draft?: boolean;
}

/**
 * 从 .md 文件路径推断 frontmatter
 */
function inferFrontmatter(mdPath: string, content: string): FrontmatterData {
  const fileName = path.basename(mdPath, '.md');
  const dirName = path.basename(path.dirname(mdPath));

  // 提取第一个标题作为 title
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch
    ? titleMatch[1].trim()
    : `${dirName} - ${fileName}`;

  // 提取前几行作为描述
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  const description = lines.slice(0, 2).join(' ').substring(0, 150) || '课程笔记';

  // 根据文件修改时间设置日期
  const stats = fs.statSync(mdPath);
  const date = stats.mtime.toISOString().split('T')[0];

  return {
    title,
    date,
    description,
    tags: ['编译原理', '课程笔记', '计算机科学'],
    category: '编译原理',
    author: 'zhuzichao',
    draft: false,
  };
}

/**
 * 生成 frontmatter 字符串
 */
function generateFrontmatter(data: FrontmatterData): string {
  return `---
title: "${data.title}"
date: "${data.date}"
description: "${data.description}"
tags: ${JSON.stringify(data.tags)}
category: "${data.category}"
author: "${data.author}"
draft: ${data.draft || false}
---

`;
}

/**
 * 同步单个 .md 文件到博客格式
 *
 * 转换逻辑:
 * - 源: 单独的 .md 文件 (如 Lec0.md)
 * - 目标: 同名文件夹下的 index.md (如 Lec0/index.md)
 */
function syncFile(mdPath: string): void {
  const fileName = path.basename(mdPath, '.md');
  const dirPath = path.dirname(mdPath);
  const targetDir = path.join(dirPath, fileName);
  const targetMdPath = path.join(targetDir, 'index.md');

  // 读取 .md 内容
  const mdContent = fs.readFileSync(mdPath, 'utf-8');

  // 检查是否已有 frontmatter
  let finalContent: string;
  const hasFrontmatter = mdContent.startsWith('---');

  if (hasFrontmatter) {
    // 已有 frontmatter，直接使用
    finalContent = mdContent;
  } else {
    // 无 frontmatter，生成并添加
    const frontmatter = inferFrontmatter(mdPath, mdContent);
    const frontmatterStr = generateFrontmatter(frontmatter);
    finalContent = frontmatterStr + mdContent;
  }

  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 确保 assets 目录存在（便于用户放置图片）
  const assetsDir = path.join(targetDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 写入 .md 文件
  fs.writeFileSync(targetMdPath, finalContent, 'utf-8');

  console.log(`✓ 已同步: ${path.relative(CONTENT_DIR, mdPath)} -> ${path.relative(CONTENT_DIR, targetMdPath)}`);
}

/**
 * 扫描并同步所有 .md 文件
 */
function syncAll(baseDir: string): number {
  let count = 0;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // 跳过已经是 index.md 的文件（这些是已经同步过的）
        if (entry.name === 'index.md') {
          continue;
        }
        // 同步 .md 文件
        syncFile(fullPath);
        count++;
      }
    }
  }

  scanDir(baseDir);
  return count;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // 同步所有文件
    console.log('🔄 开始同步所有 .md 文件到博客格式...\n');
    const count = syncAll(CONTENT_DIR);
    console.log(`\n✅ 完成！共同步 ${count} 个文件`);
  } else {
    // 同步指定文件
    for (const arg of args) {
      const mdPath = path.isAbsolute(arg) ? arg : path.join(CONTENT_DIR, arg);

      if (!fs.existsSync(mdPath)) {
        console.error(`❌ 文件不存在: ${mdPath}`);
        continue;
      }

      syncFile(mdPath);
    }
    console.log('\n✅ 完成！');
  }
}

main();
