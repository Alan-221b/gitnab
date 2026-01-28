import type { GitProvider, RepoInfo } from './types.js';

/**
 * Normalize subpath by removing leading/trailing slashes
 */
function normalizeSubpath(subpath: string): string {
  return subpath.replaceAll(/(^\/+)|(\/+$)/g, '');
}

// ============== GitHub Provider ==============

class GitHubProvider implements GitProvider {
  readonly name = 'GitHub';

  private static URL_REGEX = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/;

  canHandle(url: string): boolean {
    return url.includes('github.com');
  }

  parseUrl(url: string): RepoInfo {
    // Strip query parameters and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const match = GitHubProvider.URL_REGEX.exec(cleanUrl);
    if (!match) {
      throw new Error(
        `Invalid GitHub URL format.\n\n` +
        `Expected: https://github.com/owner/repo/tree/branch/path\n` +
        `Received: ${url}`
      );
    }
    const [, owner, repo, ref, subpath] = match;
    return { owner, repo, ref, subpath: normalizeSubpath(subpath) };
  }

  getTarballUrl(info: RepoInfo): string {
    return `https://api.github.com/repos/${info.owner}/${info.repo}/tarball/${info.ref}`;
  }

  getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'gitnab',
      'Accept': 'application/vnd.github+json',
    };
  }

  formatError(info: RepoInfo, status: number, headers: Headers): string {
    if (status === 404) {
      return (
        `Repository or branch not found: ${info.owner}/${info.repo}@${info.ref}\n` +
        `Please check that:\n` +
        `  - The repository exists and is public\n` +
        `  - The branch/tag "${info.ref}" exists`
      );
    }
    if (status === 403 && headers.get('x-ratelimit-remaining') === '0') {
      return 'GitHub API rate limit exceeded. Please wait a few minutes and try again.';
    }
    return `GitHub error: ${status}`;
  }
}

// ============== GitLab Provider ==============

class GitLabProvider implements GitProvider {
  readonly name = 'GitLab';

  // Matches: https://gitlab.com/group/subgroup/project/-/tree/branch/path
  private static URL_REGEX = /^https?:\/\/gitlab\.com\/(.+?)\/-\/tree\/([^\/]+)\/(.+)$/;

  canHandle(url: string): boolean {
    return url.includes('gitlab.com');
  }

  parseUrl(url: string): RepoInfo {
    // Strip query parameters and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '');
    const match = GitLabProvider.URL_REGEX.exec(cleanUrl);
    if (!match) {
      throw new Error(
        `Invalid GitLab URL format.\n\n` +
        `Expected: https://gitlab.com/namespace/project/-/tree/branch/path\n` +
        `Received: ${url}`
      );
    }
    const [, projectPath, ref, subpath] = match;

    // Split "group/subgroup/project" into owner + repo
    const parts = projectPath.split('/');
    const repo = parts.pop()!;
    const owner = parts.join('/');

    return { owner, repo, ref, subpath: normalizeSubpath(subpath) };
  }

  getTarballUrl(info: RepoInfo): string {
    const projectPath = info.owner ? `${info.owner}/${info.repo}` : info.repo;
    const projectId = encodeURIComponent(projectPath);
    return `https://gitlab.com/api/v4/projects/${projectId}/repository/archive.tar.gz?sha=${info.ref}`;
  }

  getHeaders(): Record<string, string> {
    return { 'User-Agent': 'gitnab' };
  }

  formatError(info: RepoInfo, status: number): string {
    const projectPath = info.owner ? `${info.owner}/${info.repo}` : info.repo;
    if (status === 404) {
      return (
        `Project or branch not found: ${projectPath}@${info.ref}\n` +
        `Please check that:\n` +
        `  - The project exists and is public\n` +
        `  - The branch/tag "${info.ref}" exists`
      );
    }
    return `GitLab error: ${status}`;
  }
}

// ============== Provider Registry ==============

const providers: GitProvider[] = [
  new GitHubProvider(),
  new GitLabProvider(),
];

/**
 * Detect provider from URL and parse into RepoInfo
 */
export function parseUrl(url: string): { provider: GitProvider; info: RepoInfo } {
  // Remove trailing slashes for consistent matching
  const trimmed = url.replace(/\/+$/, '');

  for (const provider of providers) {
    if (provider.canHandle(trimmed)) {
      return { provider, info: provider.parseUrl(trimmed) };
    }
  }

  throw new Error(
    `Unsupported URL format.\n\n` +
    `Supported formats:\n` +
    `  GitHub: https://github.com/owner/repo/tree/branch/path\n` +
    `  GitLab: https://gitlab.com/namespace/project/-/tree/branch/path\n\n` +
    `Received: ${url}`
  );
}
