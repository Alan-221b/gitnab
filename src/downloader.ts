import type { GitHubRepoInfo } from './types.js';
import { getTarballUrl } from './github-url.js';

const USER_AGENT = 'gitnab';

/**
 * Download a tarball from GitHub and return a readable stream
 *
 * @param info - The parsed GitHub repository information
 * @returns A readable stream of the tarball data
 * @throws Error if the download fails
 */
export async function downloadTarball(info: GitHubRepoInfo): Promise<ReadableStream<Uint8Array>> {
  const url = getTarballUrl(info);

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/vnd.github+json',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Repository or branch not found: ${info.owner}/${info.repo}@${info.ref}\n` +
        `Please check that:\n` +
        `  - The repository exists and is public\n` +
        `  - The branch/tag "${info.ref}" exists`
      );
    }

    if (response.status === 403) {
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining === '0') {
        throw new Error(
          `GitHub API rate limit exceeded.\n` +
          `Please wait a few minutes and try again.`
        );
      }
    }

    throw new Error(
      `Failed to download tarball: ${response.status} ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  return response.body;
}
