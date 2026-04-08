import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

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

    // 检查文件是否存在
    if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(requestedPath);

    // 防御:检测 Git LFS pointer 文件被当成图片返回的情况
    // pointer 文件是 ~130 字节的纯文本,以这一行开头
    if (
      fileBuffer.length < 1024 &&
      fileBuffer.subarray(0, 40).toString('utf8').startsWith('version https://git-lfs.github.com/spec')
    ) {
      console.error(
        `[api/images] LFS pointer detected (not smudged): ${requestedPath}\n` +
          '部署环境没有 git lfs pull,请在 Vercel Settings → Git → 启用 Git LFS,' +
          '或在 build 命令前加 git lfs pull && next build'
      );
      return new NextResponse(
        'LFS pointer not resolved on server. Enable Git LFS in deploy settings.',
        { status: 502 }
      );
    }

    // 根据文件扩展名确定 Content-Type
    const ext = path.extname(requestedPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // 用内容哈希作 ETag —— 不用 immutable 是因为同名文件可能因 LFS smudge
    // 状态变化而内容变化(本次踩坑的根因),浏览器需要在内容变了时立即拿到新版本。
    const etag = `"${createHash('sha1').update(fileBuffer).digest('hex')}"`;
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, must-revalidate',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
