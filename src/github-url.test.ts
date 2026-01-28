import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseGitHubUrl, getTarballUrl } from './github-url.js';

describe('parseGitHubUrl', () => {
  it('should parse full GitHub URL with https', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/tree/main/path/to/folder');
    
    assert.strictEqual(result.owner, 'owner');
    assert.strictEqual(result.repo, 'repo');
    assert.strictEqual(result.ref, 'main');
    assert.strictEqual(result.subpath, 'path/to/folder');
  });

  it('should parse full GitHub URL with http', () => {
    const result = parseGitHubUrl('http://github.com/owner/repo/tree/main/path/to/folder');
    
    assert.strictEqual(result.owner, 'owner');
    assert.strictEqual(result.repo, 'repo');
    assert.strictEqual(result.ref, 'main');
    assert.strictEqual(result.subpath, 'path/to/folder');
  });

  it('should parse shorthand format (owner/repo/path)', () => {
    const result = parseGitHubUrl('owner/repo/path/to/folder');
    
    assert.strictEqual(result.owner, 'owner');
    assert.strictEqual(result.repo, 'repo');
    assert.strictEqual(result.ref, 'main');
    assert.strictEqual(result.subpath, 'path/to/folder');
  });

  it('should handle trailing slashes in full URL', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/tree/main/path/to/folder///');
    
    assert.strictEqual(result.subpath, 'path/to/folder');
  });

  it('should handle trailing slashes in shorthand', () => {
    const result = parseGitHubUrl('owner/repo/path/');
    
    assert.strictEqual(result.subpath, 'path');
  });

  it('should extract correct branch/tag refs', () => {
    const resultBranch = parseGitHubUrl('https://github.com/owner/repo/tree/develop/path');
    assert.strictEqual(resultBranch.ref, 'develop');

    const resultTag = parseGitHubUrl('https://github.com/owner/repo/tree/v1.0.0/path');
    assert.strictEqual(resultTag.ref, 'v1.0.0');

    const resultSha = parseGitHubUrl('https://github.com/owner/repo/tree/abc123/path');
    assert.strictEqual(resultSha.ref, 'abc123');
  });

  it('should handle single-level subpath', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/tree/main/examples');
    
    assert.strictEqual(result.subpath, 'examples');
  });

  it('should handle deeply nested subpath', () => {
    const result = parseGitHubUrl('https://github.com/owner/repo/tree/main/a/b/c/d/e/f');
    
    assert.strictEqual(result.subpath, 'a/b/c/d/e/f');
  });

  it('should reject invalid URL formats - missing path', () => {
    assert.throws(
      () => parseGitHubUrl('https://github.com/owner/repo'),
      /Invalid GitHub URL format/
    );
  });

  it('should reject invalid URL formats - missing tree', () => {
    assert.throws(
      () => parseGitHubUrl('https://github.com/owner/repo/blob/main/file.ts'),
      /Invalid GitHub URL format/
    );
  });

  it('should reject invalid URL formats - random URL', () => {
    assert.throws(
      () => parseGitHubUrl('https://example.com/path'),
      /Invalid GitHub URL format/
    );
  });

  it('should reject invalid shorthand - only two parts', () => {
    assert.throws(
      () => parseGitHubUrl('owner/repo'),
      /Invalid GitHub URL format/
    );
  });

  it('should handle repos with dashes and underscores', () => {
    const result = parseGitHubUrl('https://github.com/my-org/my_repo-name/tree/main/src');
    
    assert.strictEqual(result.owner, 'my-org');
    assert.strictEqual(result.repo, 'my_repo-name');
    assert.strictEqual(result.subpath, 'src');
  });

  it('should handle branch names with slashes in shorthand (uses main)', () => {
    const result = parseGitHubUrl('owner/repo/feature/branch/path');
    
    assert.strictEqual(result.owner, 'owner');
    assert.strictEqual(result.repo, 'repo');
    assert.strictEqual(result.ref, 'main');
    assert.strictEqual(result.subpath, 'feature/branch/path');
  });
});

describe('getTarballUrl', () => {
  it('should build correct tarball URL', () => {
    const url = getTarballUrl({
      owner: 'facebook',
      repo: 'react',
      ref: 'main',
      subpath: 'packages/react',
    });
    
    assert.strictEqual(url, 'https://api.github.com/repos/facebook/react/tarball/main');
  });

  it('should handle special characters in ref', () => {
    const url = getTarballUrl({
      owner: 'owner',
      repo: 'repo',
      ref: 'v1.0.0',
      subpath: 'src',
    });
    
    assert.strictEqual(url, 'https://api.github.com/repos/owner/repo/tarball/v1.0.0');
  });
});
