import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseUrl } from './providers.js';

describe('parseUrl - GitHub', () => {
  it('should parse full GitHub URL with https', () => {
    const { provider, info } = parseUrl('https://github.com/owner/repo/tree/main/path/to/folder');

    assert.strictEqual(provider.name, 'GitHub');
    assert.strictEqual(info.owner, 'owner');
    assert.strictEqual(info.repo, 'repo');
    assert.strictEqual(info.ref, 'main');
    assert.strictEqual(info.subpath, 'path/to/folder');
  });

  it('should parse full GitHub URL with http', () => {
    const { provider, info } = parseUrl('http://github.com/owner/repo/tree/main/path');

    assert.strictEqual(provider.name, 'GitHub');
    assert.strictEqual(info.owner, 'owner');
    assert.strictEqual(info.repo, 'repo');
  });

  it('should handle trailing slashes', () => {
    const { info } = parseUrl('https://github.com/owner/repo/tree/main/path///');

    assert.strictEqual(info.subpath, 'path');
  });

  it('should extract correct branch/tag refs', () => {
    const { info: infoDevelop } = parseUrl('https://github.com/owner/repo/tree/develop/path');
    assert.strictEqual(infoDevelop.ref, 'develop');

    const { info: infoTag } = parseUrl('https://github.com/owner/repo/tree/v1.0.0/path');
    assert.strictEqual(infoTag.ref, 'v1.0.0');
  });

  it('should handle repos with dashes and underscores', () => {
    const { info } = parseUrl('https://github.com/my-org/my_repo-name/tree/main/src');

    assert.strictEqual(info.owner, 'my-org');
    assert.strictEqual(info.repo, 'my_repo-name');
  });

  it('should reject invalid GitHub URL - missing path', () => {
    assert.throws(
      () => parseUrl('https://github.com/owner/repo'),
      /Invalid GitHub URL format/
    );
  });

  it('should reject invalid GitHub URL - blob instead of tree', () => {
    assert.throws(
      () => parseUrl('https://github.com/owner/repo/blob/main/file.ts'),
      /Invalid GitHub URL format/
    );
  });

  it('should generate correct tarball URL', () => {
    const { provider, info } = parseUrl('https://github.com/facebook/react/tree/main/packages');
    const tarballUrl = provider.getTarballUrl(info);

    assert.strictEqual(tarballUrl, 'https://api.github.com/repos/facebook/react/tarball/main');
  });
});

describe('parseUrl - GitLab', () => {
  it('should parse full GitLab URL', () => {
    const { provider, info } = parseUrl('https://gitlab.com/owner/project/-/tree/main/path/to/folder');

    assert.strictEqual(provider.name, 'GitLab');
    assert.strictEqual(info.owner, 'owner');
    assert.strictEqual(info.repo, 'project');
    assert.strictEqual(info.ref, 'main');
    assert.strictEqual(info.subpath, 'path/to/folder');
  });

  it('should parse nested namespace (group/subgroup/project)', () => {
    const { info } = parseUrl('https://gitlab.com/group/subgroup/project/-/tree/develop/src');

    assert.strictEqual(info.owner, 'group/subgroup');
    assert.strictEqual(info.repo, 'project');
    assert.strictEqual(info.ref, 'develop');
    assert.strictEqual(info.subpath, 'src');
  });

  it('should parse deeply nested namespace', () => {
    const { info } = parseUrl('https://gitlab.com/a/b/c/project/-/tree/main/docs');

    assert.strictEqual(info.owner, 'a/b/c');
    assert.strictEqual(info.repo, 'project');
  });

  it('should handle trailing slashes', () => {
    const { info } = parseUrl('https://gitlab.com/owner/project/-/tree/main/path/');

    assert.strictEqual(info.subpath, 'path');
  });

  it('should reject invalid GitLab URL - missing /-/', () => {
    assert.throws(
      () => parseUrl('https://gitlab.com/owner/project/tree/main/path'),
      /Invalid GitLab URL format/
    );
  });

  it('should generate correct tarball URL', () => {
    const { provider, info } = parseUrl('https://gitlab.com/gitlab-org/gitlab/-/tree/master/doc');
    const tarballUrl = provider.getTarballUrl(info);

    assert.strictEqual(
      tarballUrl,
      'https://gitlab.com/api/v4/projects/gitlab-org%2Fgitlab/repository/archive.tar.gz?sha=master'
    );
  });

  it('should generate correct tarball URL for nested namespace', () => {
    const { provider, info } = parseUrl('https://gitlab.com/group/subgroup/project/-/tree/main/src');
    const tarballUrl = provider.getTarballUrl(info);

    assert.strictEqual(
      tarballUrl,
      'https://gitlab.com/api/v4/projects/group%2Fsubgroup%2Fproject/repository/archive.tar.gz?sha=main'
    );
  });
});

describe('parseUrl - Provider Detection', () => {
  it('should detect GitHub provider', () => {
    const { provider } = parseUrl('https://github.com/owner/repo/tree/main/path');
    assert.strictEqual(provider.name, 'GitHub');
  });

  it('should detect GitLab provider', () => {
    const { provider } = parseUrl('https://gitlab.com/owner/repo/-/tree/main/path');
    assert.strictEqual(provider.name, 'GitLab');
  });

  it('should throw helpful error for unsupported URL', () => {
    assert.throws(
      () => parseUrl('https://example.com/owner/repo/path'),
      /Unsupported URL format/
    );
  });

  it('should include all supported formats in error message', () => {
    try {
      parseUrl('https://example.com/path');
      assert.fail('Should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      assert.ok(message.includes('GitHub:'));
      assert.ok(message.includes('GitLab:'));
    }
  });
});

describe('Provider Headers', () => {
  it('GitHub should include Accept header', () => {
    const { provider } = parseUrl('https://github.com/owner/repo/tree/main/path');
    const headers = provider.getHeaders();

    assert.strictEqual(headers['Accept'], 'application/vnd.github+json');
    assert.strictEqual(headers['User-Agent'], 'gitnab');
  });

  it('GitLab should include User-Agent', () => {
    const { provider } = parseUrl('https://gitlab.com/owner/repo/-/tree/main/path');
    const headers = provider.getHeaders();

    assert.strictEqual(headers['User-Agent'], 'gitnab');
  });

  });
