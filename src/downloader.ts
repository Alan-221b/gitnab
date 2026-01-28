import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { Readable } from 'node:stream';
import type { GitProvider, RepoInfo } from './types.js';

/**
 * Download a tarball from a git provider and return a readable stream
 *
 * Uses native https/http modules instead of fetch to avoid Cloudflare bot detection
 *
 * @param provider - The git provider instance
 * @param info - The parsed repository information
 * @returns A readable stream of the tarball data
 * @throws Error if the download fails
 */
export async function downloadTarball(
  provider: GitProvider,
  info: RepoInfo
): Promise<ReadableStream<Uint8Array>> {
  const url = provider.getTarballUrl(info);
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const request = isHttps ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const headers = provider.getHeaders();

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers,
    };

    const req = request(options, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        const redirectUrl = res.headers.location;
        downloadFromUrl(redirectUrl, headers)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (!res.statusCode || res.statusCode >= 400) {
        // Create a mock Headers object for formatError
        const mockHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) {
            mockHeaders.set(key, Array.isArray(value) ? value[0] : value);
          }
        }
        reject(new Error(provider.formatError(info, res.statusCode || 500, mockHeaders)));
        return;
      }

      // Convert Node.js Readable to Web ReadableStream
      const webStream = Readable.toWeb(res) as ReadableStream<Uint8Array>;
      resolve(webStream);
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Download from a URL following redirects (used for redirect handling)
 */
function downloadFromUrl(
  url: string,
  headers: Record<string, string>
): Promise<ReadableStream<Uint8Array>> {
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';
  const request = isHttps ? httpsRequest : httpRequest;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers,
    };

    const req = request(options, (res) => {
      // Handle further redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFromUrl(res.headers.location, headers)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP error: ${res.statusCode}`));
        return;
      }

      const webStream = Readable.toWeb(res) as ReadableStream<Uint8Array>;
      resolve(webStream);
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.end();
  });
}
