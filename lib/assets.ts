import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const CONTENT_ASSET_MANIFEST_VERSION = 1 as const;
export const CONTENT_POSTS_DIRECTORY = 'content/posts';
export const CONTENT_ASSET_PUBLIC_PREFIX = '/_content/';
export const CONTENT_ASSET_MANIFEST_PATH = '.generated/content-assets.json';

export interface ContentAssetManifestEntry {
  /** POSIX path relative to the repository root. */
  sourcePath: string;
  /** Immutable, content-hashed URL below `public/_content`. */
  url: string;
  width: number;
  height: number;
  /** Lower-case extension including the leading dot, for example `.png`. */
  ext: string;
  /** Original file size in bytes. */
  size: number;
  /** Full SHA-256 digest of the original file. */
  hash: string;
}

export interface ContentAssetManifest {
  version: typeof CONTENT_ASSET_MANIFEST_VERSION;
  assets: Record<string, ContentAssetManifestEntry>;
}

export interface ResolveContentAssetOptions {
  /** The `typora-root-url` frontmatter value, when one is present. */
  typoraRootUrl?: string;
}

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripQueryAndHash(value: string): string {
  const queryIndex = value.indexOf('?');
  const hashIndex = value.indexOf('#');
  const indexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const end = indexes.length > 0 ? Math.min(...indexes) : value.length;
  return value.slice(0, end);
}

function decodeAssetPath(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).replaceAll('\\', '/');
    return decoded.includes('\0') ? null : decoded;
  } catch {
    return null;
  }
}

function unwrapMarkdownDestination(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function contentRelativeSourceFile(sourceFile: string): string | null {
  const normalized = sourceFile.replaceAll('\\', '/');
  const marker = `/${CONTENT_POSTS_DIRECTORY}/`;
  const markerIndex = normalized.lastIndexOf(marker);

  let relative: string;
  if (markerIndex >= 0) {
    relative = normalized.slice(markerIndex + marker.length);
  } else if (normalized.startsWith(`${CONTENT_POSTS_DIRECTORY}/`)) {
    relative = normalized.slice(CONTENT_POSTS_DIRECTORY.length + 1);
  } else {
    relative = normalized.replace(/^\.\//, '');
  }

  const safe = path.posix.normalize(relative);
  if (
    safe === '.' ||
    safe === '..' ||
    safe.startsWith('../') ||
    path.posix.isAbsolute(safe)
  ) {
    return null;
  }
  return safe;
}

function normalizeContentRelativePath(value: string): string | null {
  const normalized = path.posix.normalize(value);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }
  return normalized;
}

/**
 * Returns true for URLs that should never be looked up in the local content
 * manifest. Fragment-only references are also treated as non-local assets.
 */
export function isExternalAssetReference(reference: string): boolean {
  const value = unwrapMarkdownDestination(reference);
  return (
    value === '' ||
    value.startsWith('#') ||
    value.startsWith('//') ||
    URL_SCHEME.test(value)
  );
}

/** Detect an unresolved Git LFS pointer before it is published as an image. */
export function isGitLfsPointer(buffer: Uint8Array): boolean {
  if (buffer.byteLength > 4096) return false;
  const header = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    .subarray(0, 200)
    .toString('utf8');
  return header.startsWith('version https://git-lfs.github.com/spec/v1\n');
}

/**
 * Resolve a Markdown/HTML image reference to a manifest key.
 *
 * `sourceFile` may be repository-relative, content-root-relative, or an
 * absolute filesystem path containing `content/posts`. The returned path is
 * always POSIX-style and confined to `content/posts`.
 */
export function resolveContentAssetSourcePath(
  reference: string,
  sourceFile: string,
  options: ResolveContentAssetOptions = {},
): string | null {
  const unwrapped = unwrapMarkdownDestination(reference);
  if (isExternalAssetReference(unwrapped)) return null;

  const withoutSuffix = stripQueryAndHash(unwrapped);
  const decodedReference = decodeAssetPath(withoutSuffix);
  const relativeSourceFile = contentRelativeSourceFile(sourceFile);
  if (!decodedReference || !relativeSourceFile) return null;
  if (
    decodedReference.startsWith('//') ||
    URL_SCHEME.test(decodedReference)
  ) {
    return null;
  }

  const sourceDirectory = path.posix.dirname(relativeSourceFile);
  let contentRelativePath: string;

  if (decodedReference.startsWith('/')) {
    if (options.typoraRootUrl) {
      const rootValue = stripQueryAndHash(
        unwrapMarkdownDestination(options.typoraRootUrl),
      );
      const decodedRoot = decodeAssetPath(rootValue);
      if (
        !decodedRoot ||
        decodedRoot.startsWith('//') ||
        URL_SCHEME.test(decodedRoot)
      ) {
        return null;
      }

      const rootBase = decodedRoot.startsWith('/')
        ? decodedRoot.slice(1)
        : path.posix.join(sourceDirectory, decodedRoot);
      contentRelativePath = path.posix.join(
        rootBase,
        decodedReference.slice(1),
      );
    } else {
      contentRelativePath = decodedReference.slice(1);
    }
  } else {
    contentRelativePath = path.posix.join(sourceDirectory, decodedReference);
  }

  const safePath = normalizeContentRelativePath(contentRelativePath);
  return safePath ? `${CONTENT_POSTS_DIRECTORY}/${safePath}` : null;
}

export function resolveContentAsset(
  reference: string,
  sourceFile: string,
  manifest: ContentAssetManifest,
  options: ResolveContentAssetOptions = {},
): ContentAssetManifestEntry | null {
  const sourcePath = resolveContentAssetSourcePath(
    reference,
    sourceFile,
    options,
  );
  return sourcePath ? manifest.assets[sourcePath] ?? null : null;
}

export function parseContentAssetManifest(value: unknown): ContentAssetManifest {
  if (
    !isRecord(value) ||
    value.version !== CONTENT_ASSET_MANIFEST_VERSION ||
    !isRecord(value.assets)
  ) {
    throw new Error('Invalid content asset manifest header.');
  }

  const assets: Record<string, ContentAssetManifestEntry> = {};
  for (const [sourcePath, candidate] of Object.entries(value.assets)) {
    if (!isRecord(candidate)) {
      throw new Error(`Invalid content asset entry: ${sourcePath}`);
    }

    const { url, width, height, ext, size, hash } = candidate;
    if (
      candidate.sourcePath !== sourcePath ||
      typeof url !== 'string' ||
      !url.startsWith(CONTENT_ASSET_PUBLIC_PREFIX) ||
      url.includes('..') ||
      typeof width !== 'number' ||
      !Number.isInteger(width) ||
      width <= 0 ||
      typeof height !== 'number' ||
      !Number.isInteger(height) ||
      height <= 0 ||
      typeof ext !== 'string' ||
      !/^\.[a-z\d]+$/.test(ext) ||
      typeof size !== 'number' ||
      !Number.isInteger(size) ||
      size <= 0 ||
      typeof hash !== 'string' ||
      !/^[a-f\d]{64}$/.test(hash)
    ) {
      throw new Error(`Invalid content asset entry: ${sourcePath}`);
    }

    const safeSourcePath = resolveContentAssetSourcePath(
      `/${sourcePath.slice(CONTENT_POSTS_DIRECTORY.length + 1)}`,
      `${CONTENT_POSTS_DIRECTORY}/index.md`,
    );
    if (safeSourcePath !== sourcePath) {
      throw new Error(`Unsafe content asset source path: ${sourcePath}`);
    }

    assets[sourcePath] = candidate as unknown as ContentAssetManifestEntry;
  }

  return {
    version: CONTENT_ASSET_MANIFEST_VERSION,
    assets,
  };
}

export async function loadContentAssetManifest(
  manifestPath = path.join(process.cwd(), CONTENT_ASSET_MANIFEST_PATH),
): Promise<ContentAssetManifest> {
  let source: string;
  try {
    source = await readFile(manifestPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Content asset manifest not found at ${manifestPath}. Run the content asset preparation script first.`,
      { cause: error },
    );
  }

  try {
    return parseContentAssetManifest(JSON.parse(source) as unknown);
  } catch (error) {
    throw new Error(`Failed to load content asset manifest at ${manifestPath}.`, {
      cause: error,
    });
  }
}
