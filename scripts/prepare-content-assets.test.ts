import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadContentAssetManifest } from '../lib/assets';
import {
  ContentAssetPreparationError,
  prepareContentAssets,
} from './prepare-content-assets';

const temporaryRoots: string[] = [];

async function createProject(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'blog-content-assets-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'content/posts/topic/assets'), { recursive: true });
  return root;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe('prepareContentAssets', () => {
  it('hashes, deduplicates, manifests, and cleans generated images', async () => {
    const root = await createProject();
    const assetsDirectory = path.join(root, 'content/posts/topic/assets');
    const image = await sharp({
      create: {
        width: 4,
        height: 3,
        channels: 3,
        background: '#123456',
      },
    })
      .png()
      .toBuffer();

    await writeFile(path.join(assetsDirectory, 'image one.png'), image);
    await writeFile(path.join(assetsDirectory, 'duplicate.png'), image);

    const first = await prepareContentAssets({ projectRoot: root, quiet: true });
    expect(first.assetCount).toBe(2);
    expect(first.outputCount).toBe(1);

    const manifest = await loadContentAssetManifest(first.manifestPath);
    expect(Object.keys(manifest.assets)).toHaveLength(2);
    const expectedHash = createHash('sha256').update(image).digest('hex');
    expect(
      manifest.assets['content/posts/topic/assets/image one.png'],
    ).toMatchObject({
      width: 4,
      height: 3,
      ext: '.png',
      size: image.length,
      hash: expectedHash,
      url: `/_content/${expectedHash}.png`,
    });

    const outputFiles = await readdir(first.outputDirectory);
    expect(outputFiles).toHaveLength(1);
    expect(outputFiles[0]).toMatch(/^[a-f\d]{64}\.png$/);

    const originalManifest = await readFile(first.manifestPath, 'utf8');
    const staleName = `${randomUUID()}.png`;
    await writeFile(path.join(first.outputDirectory, staleName), image);
    await prepareContentAssets({ projectRoot: root, quiet: true });

    await expect(
      stat(path.join(first.outputDirectory, staleName)),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(first.manifestPath, 'utf8')).toBe(originalManifest);
  });

  it('rejects LFS pointers without replacing the last valid output', async () => {
    const root = await createProject();
    const assetsDirectory = path.join(root, 'content/posts/topic/assets');
    const validImage = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer();
    await writeFile(path.join(assetsDirectory, 'valid.png'), validImage);

    const first = await prepareContentAssets({ projectRoot: root, quiet: true });
    const originalManifest = await readFile(first.manifestPath, 'utf8');
    const originalOutputs = await readdir(first.outputDirectory);

    await writeFile(
      path.join(assetsDirectory, 'pointer.png'),
      'version https://git-lfs.github.com/spec/v1\n' +
        `${'oid sha256:'}${'a'.repeat(64)}\nsize 2048\n`,
    );

    await expect(
      prepareContentAssets({ projectRoot: root, quiet: true }),
    ).rejects.toBeInstanceOf(ContentAssetPreparationError);
    expect(await readFile(first.manifestPath, 'utf8')).toBe(originalManifest);
    expect(await readdir(first.outputDirectory)).toEqual(originalOutputs);
  });

  it('rejects damaged images', async () => {
    const root = await createProject();
    await writeFile(
      path.join(root, 'content/posts/topic/assets/broken.png'),
      'not a png',
    );

    await expect(
      prepareContentAssets({ projectRoot: root, quiet: true }),
    ).rejects.toThrow('damaged or unsupported image');
  });

  it('supports Unicode names, skips symlinks, and logs a concise summary', async () => {
    const root = await createProject();
    const assetsDirectory = path.join(root, 'content/posts/topic/assets');
    const nestedDirectory = path.join(assetsDirectory, '中文 (图)');
    await mkdir(nestedDirectory, { recursive: true });
    const image = await sharp({
      create: {
        width: 7,
        height: 5,
        channels: 3,
        background: '#abcdef',
      },
    })
      .jpeg()
      .toBuffer();
    const imagePath = path.join(nestedDirectory, '示例 (1).JPG');
    await writeFile(imagePath, image);
    await writeFile(path.join(assetsDirectory, 'ignore.txt'), 'not an image');
    await symlink(imagePath, path.join(assetsDirectory, 'linked.jpg'));
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await prepareContentAssets({ projectRoot: root });
    const manifest = await loadContentAssetManifest(result.manifestPath);

    expect(result).toMatchObject({ assetCount: 1, outputCount: 1 });
    expect(
      manifest.assets['content/posts/topic/assets/中文 (图)/示例 (1).JPG'],
    ).toMatchObject({ width: 7, height: 5, ext: '.jpg' });
    expect(log).toHaveBeenCalledWith(
      'Prepared 1 content image(s) as 1 hashed asset(s).',
    );
  });

  it('uses the current directory and produces an empty deterministic build', async () => {
    const root = await createProject();
    const previousDirectory = process.cwd();
    process.chdir(root);
    try {
      const first = await prepareContentAssets({ quiet: true });
      const firstManifest = await readFile(first.manifestPath, 'utf8');
      const second = await prepareContentAssets({ quiet: true });

      expect(first).toMatchObject({
        assetCount: 0,
        outputCount: 0,
        totalBytes: 0,
      });
      expect(await readFile(second.manifestPath, 'utf8')).toBe(firstManifest);
      expect(await readdir(second.outputDirectory)).toEqual([]);
    } finally {
      process.chdir(previousDirectory);
    }
  });

  it('rejects missing, non-directory, and unmanaged posts directories', async () => {
    const root = await createProject();
    const missingPosts = path.join(root, 'content/posts/missing');
    await expect(
      prepareContentAssets({
        projectRoot: root,
        postsDirectory: missingPosts,
        quiet: true,
      }),
    ).rejects.toThrow(`Posts directory does not exist: ${missingPosts}`);

    const postsFile = path.join(root, 'content/posts-file');
    await writeFile(postsFile, 'not a directory');
    await expect(
      prepareContentAssets({
        projectRoot: root,
        postsDirectory: postsFile,
        quiet: true,
      }),
    ).rejects.toThrow(`Posts directory does not exist: ${postsFile}`);

    await expect(
      prepareContentAssets({
        projectRoot: root,
        outputDirectory: root,
        quiet: true,
      }),
    ).rejects.toThrow('Output directory must be a child of the project root');
  });

  it('rejects scanned image sources outside content/posts', async () => {
    const root = await createProject();
    const alternatePosts = path.join(root, 'alternate-posts');
    await mkdir(alternatePosts, { recursive: true });
    const image = await sharp({
      create: {
        width: 3,
        height: 2,
        channels: 3,
        background: '#112233',
      },
    })
      .png()
      .toBuffer();
    await writeFile(path.join(alternatePosts, 'outside.png'), image);

    await expect(
      prepareContentAssets({
        projectRoot: root,
        postsDirectory: alternatePosts,
        quiet: true,
      }),
    ).rejects.toThrow('source image is outside content/posts');
  });
});
