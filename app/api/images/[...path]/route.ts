import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 不用 sharp 处理的格式（矢量图 / 动图）
const SKIP_SHARP_EXTS = new Set(['.svg', '.gif', '.ico']);

// 根据 Accept 头选择输出格式
function negotiateFormat(accept: string | null, ext: string): 'avif' | 'webp' | null {
  if (!accept || SKIP_SHARP_EXTS.has(ext)) return null;
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return null;
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  avif: 'image/avif',
  webp: 'image/webp',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: imagePathSegments } = await params;

  try {
    // 安全检查：只允许访问 content/posts 目录下的文件
    const contentDir = path.join(process.cwd(), 'content/posts');
    const requestedPath = path.join(contentDir, ...imagePathSegments);

    // 防止路径遍历攻击
    if (!requestedPath.startsWith(contentDir)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 检查文件是否存在（异步）
    const stat = await fs.promises.stat(requestedPath).catch(() => null);
    if (!stat || !stat.isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // 异步读取文件
    const fileBuffer = await fs.promises.readFile(requestedPath);

    // 防御：检测 Git LFS pointer 文件被当成图片返回的情况
    if (
      fileBuffer.length < 1024 &&
      fileBuffer.subarray(0, 40).toString('utf8').startsWith('version https://git-lfs.github.com/spec')
    ) {
      console.error(
        `[api/images] LFS pointer detected (not smudged): ${requestedPath}\n` +
          '部署环境没有 git lfs pull，请在 Vercel Settings → Git → 启用 Git LFS，' +
          '或在 build 命令前加 git lfs pull && next build'
      );
      return new NextResponse(
        'LFS pointer not resolved on server. Enable Git LFS in deploy settings.',
        { status: 502 }
      );
    }

    const ext = path.extname(requestedPath).toLowerCase();

    // 解析 ?w= 参数（最大宽度，仅缩小不放大）
    const wParam = request.nextUrl.searchParams.get('w');
    const maxWidth = wParam ? Math.min(Math.max(parseInt(wParam, 10), 1), 3840) : null;

    // 选择输出格式
    const accept = request.headers.get('accept');
    const targetFormat = negotiateFormat(accept, ext);

    const needsTransform = !SKIP_SHARP_EXTS.has(ext) && (maxWidth !== null || targetFormat !== null);

    let outputBuffer: Buffer = fileBuffer;
    let outputContentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    if (needsTransform) {
      try {
        let pipeline = sharp(fileBuffer);
        if (maxWidth) {
          pipeline = pipeline.resize(maxWidth, undefined, { withoutEnlargement: true });
        }
        if (targetFormat === 'avif') {
          pipeline = pipeline.avif({ quality: 72 });
          outputContentType = 'image/avif';
        } else if (targetFormat === 'webp') {
          pipeline = pipeline.webp({ quality: 82 });
          outputContentType = 'image/webp';
        }
        outputBuffer = await pipeline.toBuffer();
      } catch {
        // sharp 处理失败时退回原图（如损坏文件）
        outputBuffer = fileBuffer;
        outputContentType = CONTENT_TYPES[ext] || 'application/octet-stream';
      }
    }

    // ETag 包含变换参数，避免不同尺寸/格式命中同一缓存
    const etagKey = `${maxWidth ?? ''}:${targetFormat ?? 'orig'}`;
    const etag = `"${createHash('sha1').update(outputBuffer).update(etagKey).digest('hex')}"`;

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': outputContentType,
        // 1 周强缓存 + 1 天 stale-while-revalidate
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        ETag: etag,
        Vary: 'Accept',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
