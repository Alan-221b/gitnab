import type { GitHubRepoInfo } from './types.js';

/**
 * Regex to parse full GitHub URLs with tree path
 * Matches: https://github.com/owner/repo/tree/branch/path/to/folder
 */
const GITHUB_URL_REGEX = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/;

/**
 * Regex to parse shorthand format
 * Matches: owner/repo/path/to/folder (assumes main branch)
 */
const SHORTHAND_REGEX = /^([^\/]+)\/([^\/]+)\/(.+)$/;

/**
 * Parse a GitHub URL or shorthand into repository information
 *
 * Supported formats:
 * - https://github.com/owner/repo/tree/branch/path/to/folder
 * - owner/repo/path/to/folder (defaults to main branch)
 *
 * @param input - The GitHub URL or shorthand to parse
 * @returns Parsed repository information
 * @throws Error if the input format is invalid
 */
export function parseGitHubUrl(input: string): GitHubRepoInfo {
  // Remove trailing slashes
  const trimmed = input.replace(/\/+$/, '');

  // Try full URL format first
  const urlMatch = trimmed.match(GITHUB_URL_REGEX);
  if (urlMatch) {
    const [, owner, repo, ref, subpath] = urlMatch;
    return {
      owner,
      repo,
      ref,
      subpath: normalizeSubpath(subpath),
    };
  }

  // Try shorthand format
  const shorthandMatch = trimmed.match(SHORTHAND_REGEX);
  if (shorthandMatch) {
    const [, owner, repo, subpath] = shorthandMatch;
    return {
      owner,
      repo,
      ref: 'main',
      subpath: normalizeSubpath(subpath),
    };
  }

  throw new Error(
    `Invalid GitHub URL format.\n\n` +
    `Expected formats:\n` +
    `  https://github.com/owner/repo/tree/branch/path/to/folder\n` +
    `  owner/repo/path/to/folder (defaults to main branch)\n\n` +
    `Received: ${input}`
  );
}

/**
 * Normalize the subpath by removing leading/trailing slashes
 */
function normalizeSubpath(subpath: string): string {
  return subpath.replace(/^\/+|\/+$/g, '');
}

/**
 * Build the GitHub API tarball URL
 */
export function getTarballUrl(info: GitHubRepoInfo): string {
  return `https://api.github.com/repos/${info.owner}/${info.repo}/tarball/${info.ref}`;
}
