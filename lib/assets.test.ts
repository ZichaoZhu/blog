import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CONTENT_ASSET_MANIFEST_PATH,
  CONTENT_ASSET_MANIFEST_VERSION,
  isExternalAssetReference,
  isGitLfsPointer,
  loadContentAssetManifest,
  parseContentAssetManifest,
  resolveContentAsset,
  resolveContentAssetSourcePath,
  type ContentAssetManifest,
} from './assets';

const temporaryRoots: string[] = [];

async function createTemporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'blog-assets-test-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe('resolveContentAssetSourcePath', () => {
  const sourceFile =
    'content/posts/Coure-Notebook/Operating_System/Lec1.md';

  it('resolves relative, bare, parent, and encoded paths', () => {
    expect(
      resolveContentAssetSourcePath('./assets/image.png', sourceFile),
    ).toBe(
      'content/posts/Coure-Notebook/Operating_System/assets/image.png',
    );
    expect(resolveContentAssetSourcePath('image.png', sourceFile)).toBe(
      'content/posts/Coure-Notebook/Operating_System/image.png',
    );
    expect(resolveContentAssetSourcePath('../shared/image.png', sourceFile)).toBe(
      'content/posts/Coure-Notebook/shared/image.png',
    );
    expect(
      resolveContentAssetSourcePath(
        './assets/NotebookLM%20Mind%20Map%20(2).png?raw=1#diagram',
        sourceFile,
      ),
    ).toBe(
      'content/posts/Coure-Notebook/Operating_System/assets/NotebookLM Mind Map (2).png',
    );
    expect(
      resolveContentAssetSourcePath(
        '<./assets/%E4%B8%AD%E6%96%87%20%E5%9B%BE%20(1).png?download=1#figure>',
        sourceFile,
      ),
    ).toBe(
      'content/posts/Coure-Notebook/Operating_System/assets/中文 图 (1).png',
    );
    expect(
      resolveContentAssetSourcePath(
        String.raw`assets\diagram.png`,
        String.raw`content\posts\topic\note.md`,
      ),
    ).toBe('content/posts/topic/assets/diagram.png');
  });

  it('accepts absolute source filenames and content-root image paths', () => {
    expect(
      resolveContentAssetSourcePath(
        '/shared/image.png',
        '/workspace/blog/content/posts/topic/note.md',
      ),
    ).toBe('content/posts/shared/image.png');
  });

  it('uses typora-root-url for slash-prefixed references', () => {
    expect(
      resolveContentAssetSourcePath(
        '/assets/image.png',
        'content/posts/topic/section/note.md',
        { typoraRootUrl: '..' },
      ),
    ).toBe('content/posts/topic/assets/image.png');
    expect(
      resolveContentAssetSourcePath(
        '/assets/%E4%B8%AD%E6%96%87%20(2).png#preview',
        'content/posts/topic/section/note.md',
        { typoraRootUrl: '/shared/root?ignored=1' },
      ),
    ).toBe('content/posts/shared/root/assets/中文 (2).png');
    expect(
      resolveContentAssetSourcePath(
        '/assets/image.png',
        'topic/section/note.md',
        { typoraRootUrl: '.' },
      ),
    ).toBe('content/posts/topic/section/assets/image.png');
  });

  it('rejects traversal, malformed encoding, null bytes, and external URLs', () => {
    expect(
      resolveContentAssetSourcePath('../../../secret.png', sourceFile),
    ).toBeNull();
    expect(
      resolveContentAssetSourcePath(
        '..%2F..%2F..%2Fsecret.png',
        sourceFile,
      ),
    ).toBeNull();
    expect(resolveContentAssetSourcePath('%XX.png', sourceFile)).toBeNull();
    expect(resolveContentAssetSourcePath('image%00.png', sourceFile)).toBeNull();
    expect(
      resolveContentAssetSourcePath('https://example.com/image.png', sourceFile),
    ).toBeNull();
    expect(
      resolveContentAssetSourcePath('data:image/png;base64,abc', sourceFile),
    ).toBeNull();
    expect(
      resolveContentAssetSourcePath(
        'https%3A%2F%2Fexample.com%2Fimage.png',
        sourceFile,
      ),
    ).toBeNull();
    expect(resolveContentAssetSourcePath('image.png', '../note.md')).toBeNull();
    expect(resolveContentAssetSourcePath('image.png', '/note.md')).toBeNull();
  });

  it('rejects unsafe or malformed Typora root URLs', () => {
    for (const typoraRootUrl of [
      'https://example.com/assets',
      '//cdn.example.com/assets',
      '%XX',
      '../../../outside',
    ]) {
      expect(
        resolveContentAssetSourcePath(
          '/image.png',
          'content/posts/topic/note.md',
          { typoraRootUrl },
        ),
      ).toBeNull();
    }
  });
});

describe('content asset manifest', () => {
  const sourcePath = 'content/posts/topic/assets/image.png';
  const hash = 'a'.repeat(64);
  const manifest: ContentAssetManifest = {
    version: CONTENT_ASSET_MANIFEST_VERSION,
    assets: {
      [sourcePath]: {
        sourcePath,
        url: `/_content/${hash}.png`,
        width: 16,
        height: 9,
        ext: '.png',
        size: 128,
        hash,
      },
    },
  };

  it('parses valid manifests and resolves entries', () => {
    expect(parseContentAssetManifest(manifest)).toEqual(manifest);
    expect(
      resolveContentAsset(
        './assets/image.png',
        'content/posts/topic/note.md',
        manifest,
      ),
    ).toEqual(manifest.assets[sourcePath]);
    expect(
      resolveContentAsset(
        './assets/missing.png',
        'content/posts/topic/note.md',
        manifest,
      ),
    ).toBeNull();
    expect(
      resolveContentAsset(
        'https://example.com/image.png',
        'content/posts/topic/note.md',
        manifest,
      ),
    ).toBeNull();
  });

  it.each([
    ['null value', null],
    ['array value', []],
    ['wrong version', { version: 2, assets: {} }],
    ['missing assets', { version: CONTENT_ASSET_MANIFEST_VERSION }],
    ['array assets', { version: CONTENT_ASSET_MANIFEST_VERSION, assets: [] }],
  ])('rejects an invalid manifest header: %s', (_label, value) => {
    expect(() => parseContentAssetManifest(value)).toThrow(
      'Invalid content asset manifest header',
    );
  });

  it('rejects non-object entries', () => {
    expect(() =>
      parseContentAssetManifest({
        version: CONTENT_ASSET_MANIFEST_VERSION,
        assets: { [sourcePath]: null },
      }),
    ).toThrow(`Invalid content asset entry: ${sourcePath}`);
  });

  it.each([
    ['sourcePath mismatch', 'sourcePath', 'content/posts/other.png'],
    ['non-string URL', 'url', 42],
    ['wrong URL prefix', 'url', '/images/file.png'],
    ['traversing URL', 'url', '/_content/../file.png'],
    ['non-numeric width', 'width', '16'],
    ['fractional width', 'width', 1.5],
    ['non-positive width', 'width', 0],
    ['non-numeric height', 'height', '9'],
    ['fractional height', 'height', 1.5],
    ['non-positive height', 'height', 0],
    ['invalid extension', 'ext', '.PNG'],
    ['non-numeric size', 'size', '128'],
    ['fractional size', 'size', 1.5],
    ['non-positive size', 'size', 0],
    ['invalid hash', 'hash', 'not-a-sha256'],
  ])('rejects an invalid entry: %s', (_label, field, value) => {
    const invalid = structuredClone(manifest) as unknown as {
      assets: Record<string, Record<string, unknown>>;
    };
    invalid.assets[sourcePath][field] = value;
    expect(() => parseContentAssetManifest(invalid)).toThrow(
      `Invalid content asset entry: ${sourcePath}`,
    );
  });

  it('rejects unsafe manifest keys', () => {
    const unsafe = structuredClone(manifest) as ContentAssetManifest;
    const entry = unsafe.assets[sourcePath];
    delete unsafe.assets[sourcePath];
    unsafe.assets['content/posts/../image.png'] = {
      ...entry,
      sourcePath: 'content/posts/../image.png',
    };
    expect(() => parseContentAssetManifest(unsafe)).toThrow(
      'Unsafe content asset source path',
    );
  });
});

describe('loadContentAssetManifest', () => {
  it('loads and validates a generated manifest', async () => {
    const root = await createTemporaryRoot();
    const manifestPath = path.join(root, CONTENT_ASSET_MANIFEST_PATH);
    const sourcePath = 'content/posts/topic/image.png';
    const hash = 'b'.repeat(64);
    const manifest: ContentAssetManifest = {
      version: CONTENT_ASSET_MANIFEST_VERSION,
      assets: {
        [sourcePath]: {
          sourcePath,
          url: `/_content/${hash}.png`,
          width: 2,
          height: 3,
          ext: '.png',
          size: 64,
          hash,
        },
      },
    };
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest));

    await expect(loadContentAssetManifest(manifestPath)).resolves.toEqual(
      manifest,
    );
  });

  it('reports missing and malformed manifests with their path', async () => {
    const root = await createTemporaryRoot();
    const missingPath = path.join(root, 'missing.json');
    await expect(loadContentAssetManifest(missingPath)).rejects.toThrow(
      `Content asset manifest not found at ${missingPath}`,
    );

    const malformedPath = path.join(root, 'malformed.json');
    await writeFile(malformedPath, '{not json');
    await expect(loadContentAssetManifest(malformedPath)).rejects.toThrow(
      `Failed to load content asset manifest at ${malformedPath}`,
    );
  });
});

describe('asset guards', () => {
  it('recognizes external references', () => {
    expect(isExternalAssetReference('')).toBe(true);
    expect(isExternalAssetReference('  #diagram  ')).toBe(true);
    expect(isExternalAssetReference('//cdn.example.com/image.png')).toBe(true);
    expect(isExternalAssetReference('mailto:test@example.com')).toBe(true);
    expect(isExternalAssetReference('<https://example.com/image.png>')).toBe(
      true,
    );
    expect(isExternalAssetReference('./assets/image.png')).toBe(false);
  });

  it('detects unresolved Git LFS pointers', () => {
    const pointer = Buffer.from(
      'version https://git-lfs.github.com/spec/v1\n' +
        'oid sha256:0123456789abcdef\nsize 42\n',
    );
    expect(isGitLfsPointer(pointer)).toBe(true);
    expect(isGitLfsPointer(Buffer.from('a real image payload'))).toBe(false);
    expect(isGitLfsPointer(Buffer.alloc(4097))).toBe(false);
  });
});
