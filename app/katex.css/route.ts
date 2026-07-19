import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';

export async function GET() {
  const css = await readFile(
    path.join(process.cwd(), 'node_modules/katex/dist/katex.min.css'),
    'utf8',
  );
  return new Response(css, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600',
    },
  });
}
