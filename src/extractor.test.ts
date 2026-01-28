import { describe, it } from 'node:test';
import assert from 'node:assert';

/**
 * Test helper functions for path matching and strip count calculation
 * These mirror the logic in extractor.ts
 */

/**
 * Check if a path within the tarball matches the requested subpath
 */
function pathMatchesSubfolder(
  tarballPath: string,
  tarballPrefix: string,
  subpath: string
): boolean {
  // Remove the tarball prefix (e.g., "owner-repo-abc1234/")
  const relativePath = tarballPath.slice(tarballPrefix.length);
  
  const subpathParts = subpath.split('/').filter(Boolean);
  const pathParts = relativePath.split('/').filter(Boolean);

  // The path must start with the subpath
  for (let i = 0; i < subpathParts.length; i++) {
    if (pathParts[i] !== subpathParts[i]) {
      return false;
    }
  }

  // Must have content beyond just the subpath directory itself
  return pathParts.length > subpathParts.length;
}

/**
 * Calculate how many path components to strip when extracting
 */
function calculateStripCount(subpath: string, keepFolderName: boolean): number {
  const subpathParts = subpath.split('/').filter(Boolean);
  const subpathDepth = subpathParts.length;
  
  // Tarball prefix (1) + subpath components
  // If keepFolderName is true, keep the last subpath component
  return 1 + (keepFolderName ? subpathDepth - 1 : subpathDepth);
}

/**
 * Calculate the output path for a file after stripping
 */
function calculateOutputPath(
  tarballPath: string,
  stripCount: number
): string {
  const pathParts = tarballPath.split('/');
  return pathParts.slice(stripCount).join('/');
}

describe('pathMatchesSubfolder', () => {
  const prefix = 'owner-repo-abc1234/';

  it('should match files directly within subpath', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/examples/file.ts',
      prefix,
      'examples'
    );
    assert.strictEqual(result, true);
  });

  it('should match files in nested directories within subpath', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/examples/nested/deep/file.ts',
      prefix,
      'examples'
    );
    assert.strictEqual(result, true);
  });

  it('should not match files outside subpath', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/src/file.ts',
      prefix,
      'examples'
    );
    assert.strictEqual(result, false);
  });

  it('should not match the subpath directory itself', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/examples/',
      prefix,
      'examples'
    );
    assert.strictEqual(result, false);
  });

  it('should handle nested subpaths', () => {
    const matchInside = pathMatchesSubfolder(
      'owner-repo-abc1234/src/components/Button/index.ts',
      prefix,
      'src/components'
    );
    assert.strictEqual(matchInside, true);

    const matchOutside = pathMatchesSubfolder(
      'owner-repo-abc1234/src/utils/helper.ts',
      prefix,
      'src/components'
    );
    assert.strictEqual(matchOutside, false);
  });

  it('should not match partial folder names', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/examples-v2/file.ts',
      prefix,
      'examples'
    );
    assert.strictEqual(result, false);
  });

  it('should handle root-level subpath', () => {
    const result = pathMatchesSubfolder(
      'owner-repo-abc1234/docs/README.md',
      prefix,
      'docs'
    );
    assert.strictEqual(result, true);
  });
});

describe('calculateStripCount', () => {
  it('should calculate correct strip count without keepFolderName', () => {
    // Single level subpath: strip "prefix/" + "examples/" = 2
    assert.strictEqual(calculateStripCount('examples', false), 2);
  });

  it('should calculate correct strip count with keepFolderName', () => {
    // Single level subpath with keep: strip only "prefix/" = 1
    // (keeping "examples/")
    assert.strictEqual(calculateStripCount('examples', true), 1);
  });

  it('should handle nested subpath without keepFolderName', () => {
    // Nested subpath: strip "prefix/" + "src/" + "components/" = 3
    assert.strictEqual(calculateStripCount('src/components', false), 3);
  });

  it('should handle nested subpath with keepFolderName', () => {
    // Nested subpath with keep: strip "prefix/" + "src/" = 2
    // (keeping "components/")
    assert.strictEqual(calculateStripCount('src/components', true), 2);
  });

  it('should handle deeply nested subpath', () => {
    // a/b/c/d: 4 parts
    assert.strictEqual(calculateStripCount('a/b/c/d', false), 5);
    assert.strictEqual(calculateStripCount('a/b/c/d', true), 4);
  });
});

describe('calculateOutputPath', () => {
  it('should strip correct number of components', () => {
    const result = calculateOutputPath(
      'owner-repo-abc1234/examples/file.ts',
      2
    );
    assert.strictEqual(result, 'file.ts');
  });

  it('should preserve nested structure after stripping', () => {
    const result = calculateOutputPath(
      'owner-repo-abc1234/examples/nested/deep/file.ts',
      2
    );
    assert.strictEqual(result, 'nested/deep/file.ts');
  });

  it('should keep folder name when strip count is lower', () => {
    const result = calculateOutputPath(
      'owner-repo-abc1234/examples/file.ts',
      1
    );
    assert.strictEqual(result, 'examples/file.ts');
  });

  it('should handle deeply nested stripping', () => {
    const result = calculateOutputPath(
      'owner-repo-abc1234/src/components/Button/index.ts',
      3
    );
    assert.strictEqual(result, 'Button/index.ts');
  });
});

describe('integration scenarios', () => {
  it('should correctly extract to current directory without keepFolderName', () => {
    const tarballPath = 'vercel-next.js-abc1234/examples/hello-world/package.json';
    const prefix = 'vercel-next.js-abc1234/';
    const subpath = 'examples/hello-world';
    
    // Verify the path matches
    assert.strictEqual(pathMatchesSubfolder(tarballPath, prefix, subpath), true);
    
    // Calculate strip count (no keep)
    const stripCount = calculateStripCount(subpath, false);
    assert.strictEqual(stripCount, 3); // 1 + 2 subpath parts
    
    // Calculate output path
    const outputPath = calculateOutputPath(tarballPath, stripCount);
    assert.strictEqual(outputPath, 'package.json');
  });

  it('should correctly extract with keepFolderName', () => {
    const tarballPath = 'vercel-next.js-abc1234/examples/hello-world/src/index.ts';
    const prefix = 'vercel-next.js-abc1234/';
    const subpath = 'examples/hello-world';
    
    // Verify the path matches
    assert.strictEqual(pathMatchesSubfolder(tarballPath, prefix, subpath), true);
    
    // Calculate strip count (with keep)
    const stripCount = calculateStripCount(subpath, true);
    assert.strictEqual(stripCount, 2); // 1 + (2 - 1) = keep "hello-world"
    
    // Calculate output path
    const outputPath = calculateOutputPath(tarballPath, stripCount);
    assert.strictEqual(outputPath, 'hello-world/src/index.ts');
  });
});
