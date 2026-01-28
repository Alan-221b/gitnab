import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, readFileSync, existsSync, writeFileSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import * as tar from 'tar';
import { extractTarball } from './extractor.js';

describe('extractTarball', () => {
  let testDir: string;
  let sourceDir: string;
  let tarballPath: string;

  beforeEach(() => {
    const base = join(tmpdir(), `gitnab-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    testDir = join(base, 'output');
    sourceDir = join(base, 'source');
    tarballPath = join(base, 'test.tar');
    mkdirSync(testDir, { recursive: true });
    mkdirSync(sourceDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(join(testDir, '..'), { recursive: true, force: true });
  });

  /**
   * Create a tarball stream from a directory structure
   */
  async function createTarballStream(
    prefix: string,
    files: { path: string; content?: string }[]
  ): Promise<ReadableStream<Uint8Array>> {
    // Create the source directory structure
    const prefixDir = join(sourceDir, prefix);
    mkdirSync(prefixDir, { recursive: true });

    for (const file of files) {
      const fullPath = join(prefixDir, file.path);
      if (file.content !== undefined) {
        mkdirSync(join(fullPath, '..'), { recursive: true });
        writeFileSync(fullPath, file.content);
      } else {
        mkdirSync(fullPath, { recursive: true });
      }
    }

    // Create tarball file
    await tar.create(
      {
        file: tarballPath,
        cwd: sourceDir,
        gzip: false,
      },
      [prefix]
    );

    // Read tarball and convert to web stream
    const nodeStream = createReadStream(tarballPath);
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  }

  it('should extract files from subpath', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'src/index.ts', content: 'console.log("src")' },
      { path: 'examples/demo.ts', content: 'console.log("demo")' },
      { path: 'examples/nested/deep.ts', content: 'console.log("deep")' },
    ]);

    await extractTarball(stream, {
      destination: testDir,
      subpath: 'examples',
      keepFolderName: false,
    });

    assert.strictEqual(readFileSync(join(testDir, 'demo.ts'), 'utf-8'), 'console.log("demo")');
    assert.strictEqual(readFileSync(join(testDir, 'nested/deep.ts'), 'utf-8'), 'console.log("deep")');
    assert.strictEqual(existsSync(join(testDir, 'index.ts')), false);
  });

  it('should keep folder name when keepFolderName is true', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'examples/file.ts', content: 'content' },
    ]);

    await extractTarball(stream, {
      destination: testDir,
      subpath: 'examples',
      keepFolderName: true,
    });

    assert.strictEqual(readFileSync(join(testDir, 'examples/file.ts'), 'utf-8'), 'content');
  });

  it('should handle nested subpaths', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'src/components/Button/index.ts', content: 'button' },
      { path: 'src/components/Input/index.ts', content: 'input' },
      { path: 'src/utils/helper.ts', content: 'helper' },
    ]);

    await extractTarball(stream, {
      destination: testDir,
      subpath: 'src/components',
      keepFolderName: false,
    });

    assert.strictEqual(readFileSync(join(testDir, 'Button/index.ts'), 'utf-8'), 'button');
    assert.strictEqual(readFileSync(join(testDir, 'Input/index.ts'), 'utf-8'), 'input');
    assert.strictEqual(existsSync(join(testDir, 'helper.ts')), false);
  });

  it('should throw error when no files found', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'src/index.ts', content: 'content' },
    ]);

    await assert.rejects(
      () => extractTarball(stream, {
        destination: testDir,
        subpath: 'nonexistent',
        keepFolderName: false,
      }),
      /No files found at path "nonexistent"/
    );
  });

  it('should handle directories in tarball', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'examples/nested/file.ts', content: 'nested content' },
    ]);

    await extractTarball(stream, {
      destination: testDir,
      subpath: 'examples',
      keepFolderName: false,
    });

    assert.strictEqual(readFileSync(join(testDir, 'nested/file.ts'), 'utf-8'), 'nested content');
  });

  it('should handle nested subpath with keepFolderName', async () => {
    const stream = await createTarballStream('owner-repo-abc123', [
      { path: 'a/b/c/file.ts', content: 'deep' },
    ]);

    await extractTarball(stream, {
      destination: testDir,
      subpath: 'a/b/c',
      keepFolderName: true,
    });

    assert.strictEqual(readFileSync(join(testDir, 'c/file.ts'), 'utf-8'), 'deep');
  });
});
