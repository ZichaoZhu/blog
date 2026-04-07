import { NextRequest, NextResponse } from 'next/server';
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

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
