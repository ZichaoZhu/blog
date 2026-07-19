import { createHash, randomUUID } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  CONTENT_ASSET_MANIFEST_PATH,
  CONTENT_ASSET_MANIFEST_VERSION,
  CONTENT_ASSET_PUBLIC_PREFIX,
  CONTENT_POSTS_DIRECTORY,
  isGitLfsPointer,
  type ContentAssetManifest,
  type ContentAssetManifestEntry,
} from '../lib/assets';

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

export interface PrepareContentAssetsOptions {
  projectRoot?: string;
  postsDirectory?: string;
  outputDirectory?: string;
  manifestPath?: string;
  quiet?: boolean;
}

export interface PrepareContentAssetsResult {
  assetCount: number;
  outputCount: number;
  totalBytes: number;
  manifestPath: string;
  outputDirectory: string;
}

interface AssetIssue {
  sourcePath: string;
  message: string;
}

export class ContentAssetPreparationError extends Error {
  readonly issues: AssetIssue[];

  constructor(issues: AssetIssue[]) {
    const details = issues
      .map(({ sourcePath, message }) => `  - ${sourcePath}: ${message}`)
      .join('\n');
    super(
      `Content asset preparation failed with ${issues.length} invalid asset(s):\n${details}`,
    );
    this.name = 'ContentAssetPreparationError';
    this.issues = issues;
  }
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function assertManagedPath(
  projectRoot: string,
  candidate: string,
  label: string,
): void {
  const relative = path.relative(projectRoot, candidate);
  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${label} must be a child of the project root: ${candidate}`);
  }
}

async function findImages(directory: string): Promise<string[]> {
  const images: string[] = [];

  async function walk(currentDirectory: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));

    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (
        entry.isFile() &&
        IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        images.push(absolutePath);
      }
    }
  }

  await walk(directory);
  return images;
}

function validatedDimensions(
  width: number | undefined,
  height: number | undefined,
): { width: number; height: number } {
  if (
    typeof width !== 'number' ||
    !Number.isInteger(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new Error('image has no valid intrinsic width and height');
  }
  return { width, height };
}

async function prepareEntry(
  absolutePath: string,
  projectRoot: string,
  stagingDirectory: string,
  emittedFiles: Set<string>,
): Promise<ContentAssetManifestEntry> {
  const sourcePath = toPosix(path.relative(projectRoot, absolutePath));
  if (!sourcePath.startsWith(`${CONTENT_POSTS_DIRECTORY}/`)) {
    throw new Error('source image is outside content/posts');
  }

  const fileBuffer = await readFile(absolutePath);
  if (isGitLfsPointer(fileBuffer)) {
    throw new Error(
      'unresolved Git LFS pointer; fetch the binary with `git lfs pull`',
    );
  }

  const digest = createHash('sha256').update(fileBuffer).digest('hex');
  const ext = path.extname(absolutePath).toLowerCase();
  const outputName = `${digest}${ext}`;

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    const image = sharp(fileBuffer, { animated: false, failOn: 'error' });
    metadata = await image.metadata();
    // `metadata()` validates the header. `stats()` forces pixel decoding so a
    // truncated/corrupt payload fails during the build instead of at runtime.
    await image.stats();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`damaged or unsupported image (${detail})`);
  }

  const { width, height } = validatedDimensions(
    metadata.width,
    metadata.pageHeight ?? metadata.height,
  );

  if (!emittedFiles.has(outputName)) {
    await copyFile(absolutePath, path.join(stagingDirectory, outputName));
    emittedFiles.add(outputName);
  }

  return {
    sourcePath,
    url: `${CONTENT_ASSET_PUBLIC_PREFIX}${outputName}`,
    width,
    height,
    ext,
    size: fileBuffer.byteLength,
    hash: digest,
  };
}

export async function prepareContentAssets(
  options: PrepareContentAssetsOptions = {},
): Promise<PrepareContentAssetsResult> {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const postsDirectory = path.resolve(
    options.postsDirectory ?? path.join(projectRoot, CONTENT_POSTS_DIRECTORY),
  );
  const outputDirectory = path.resolve(
    options.outputDirectory ?? path.join(projectRoot, 'public/_content'),
  );
  const manifestPath = path.resolve(
    options.manifestPath ?? path.join(projectRoot, CONTENT_ASSET_MANIFEST_PATH),
  );

  assertManagedPath(projectRoot, postsDirectory, 'Posts directory');
  assertManagedPath(projectRoot, outputDirectory, 'Output directory');
  assertManagedPath(projectRoot, manifestPath, 'Manifest path');

  const postsStats = await stat(postsDirectory).catch(() => null);
  if (!postsStats?.isDirectory()) {
    throw new Error(`Posts directory does not exist: ${postsDirectory}`);
  }

  const transactionId = `${process.pid}-${randomUUID()}`;
  const stagingDirectory = path.join(
    path.dirname(outputDirectory),
    `.content-assets-${transactionId}`,
  );
  const temporaryManifest = `${manifestPath}.${transactionId}.tmp`;

  await mkdir(path.dirname(outputDirectory), { recursive: true });
  await mkdir(path.dirname(manifestPath), { recursive: true });
  await rm(stagingDirectory, { recursive: true, force: true });
  await mkdir(stagingDirectory, { recursive: true });

  try {
    const imagePaths = await findImages(postsDirectory);
    const assets: Record<string, ContentAssetManifestEntry> = {};
    const emittedFiles = new Set<string>();
    const issues: AssetIssue[] = [];
    let totalBytes = 0;

    for (const imagePath of imagePaths) {
      const sourcePath = toPosix(path.relative(projectRoot, imagePath));
      try {
        const entry = await prepareEntry(
          imagePath,
          projectRoot,
          stagingDirectory,
          emittedFiles,
        );
        assets[entry.sourcePath] = entry;
        totalBytes += entry.size;
      } catch (error) {
        issues.push({
          sourcePath,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (issues.length > 0) {
      throw new ContentAssetPreparationError(issues);
    }

    const manifest: ContentAssetManifest = {
      version: CONTENT_ASSET_MANIFEST_VERSION,
      assets,
    };
    const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(temporaryManifest, serializedManifest, 'utf8');

    // Replace the complete directory so files no longer referenced by the
    // manifest cannot linger between builds.
    await rm(outputDirectory, { recursive: true, force: true });
    await rename(stagingDirectory, outputDirectory);
    await rm(manifestPath, { force: true });
    await rename(temporaryManifest, manifestPath);

    const result: PrepareContentAssetsResult = {
      assetCount: imagePaths.length,
      outputCount: emittedFiles.size,
      totalBytes,
      manifestPath,
      outputDirectory,
    };

    if (!options.quiet) {
      console.log(
        `Prepared ${result.assetCount} content image(s) as ${result.outputCount} hashed asset(s).`,
      );
    }
    return result;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
    await rm(temporaryManifest, { force: true });
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  prepareContentAssets().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
