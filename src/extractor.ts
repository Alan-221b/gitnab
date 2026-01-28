import { Readable } from 'node:stream';
import { mkdirSync, createWriteStream } from 'node:fs';
import { dirname } from 'node:path';
import * as tar from 'tar';
import type { ExtractOptions } from './types.js';

/**
 * Extract files from a tarball stream, filtering to only include files
 * within the specified subpath
 *
 * @param stream - The readable stream containing tarball data
 * @param options - Extraction options including destination and subpath
 */
export async function extractTarball(
  stream: ReadableStream<Uint8Array>,
  options: ExtractOptions
): Promise<void> {
  const { destination, subpath, keepFolderName } = options;

  // Track if we found any matching files
  let foundFiles = false;

  // The tarball from GitHub has a prefix like "owner-repo-hash/"
  // We need to detect this prefix from the first entry
  let tarballPrefix: string | null = null;

  // Calculate the full path prefix we're looking for
  const subpathParts = subpath.split('/').filter(Boolean);

  // Convert web stream to node stream
  const nodeStream = Readable.fromWeb(stream as import('stream/web').ReadableStream);

  await new Promise<void>((resolve, reject) => {
    const writePromises: Promise<void>[] = [];

    const parser = new tar.Parser({
      filter: (path) => {
        // Detect the tarball prefix from the first entry
        if (tarballPrefix === null) {
          const firstSlash = path.indexOf('/');
          if (firstSlash > 0) {
            tarballPrefix = path.slice(0, firstSlash + 1);
          }
        }

        if (!tarballPrefix) {
          return false;
        }

        // Remove the tarball prefix (e.g., "owner-repo-abc1234/")
        const relativePath = path.slice(tarballPrefix.length);

        // Check if this path is within our subpath
        const pathParts = relativePath.split('/').filter(Boolean);

        // The path must start with the subpath
        for (let i = 0; i < subpathParts.length; i++) {
          if (pathParts[i] !== subpathParts[i]) {
            return false;
          }
        }

        // Must have content beyond just the subpath directory itself
        if (pathParts.length <= subpathParts.length) {
          return false;
        }

        foundFiles = true;
        return true;
      },
      onReadEntry: (entry) => {
        if (!tarballPrefix) {
          entry.resume();
          return;
        }

        // Calculate how many path components to strip
        // Tarball prefix (1) + subpath components
        // If keepFolderName is true, keep the last subpath component
        const subpathDepth = subpathParts.length;
        const stripCount = 1 + (keepFolderName ? subpathDepth - 1 : subpathDepth);

        // Calculate the new path
        const pathParts = entry.path.split('/');
        const newPath = pathParts.slice(stripCount).join('/');

        if (!newPath) {
          entry.resume();
          return;
        }

        // Write the entry to the destination
        const extractPath = `${destination}/${newPath}`;

        if (entry.type === 'Directory') {
          mkdirSync(extractPath, { recursive: true });
          entry.resume();
        } else if (entry.type === 'File') {
          mkdirSync(dirname(extractPath), { recursive: true });
          const writeStream = createWriteStream(extractPath);
          writePromises.push(new Promise<void>((res, rej) => {
            writeStream.on('finish', res);
            writeStream.on('error', rej);
          }));
          entry.pipe(writeStream);
        } else {
          entry.resume();
        }
      },
    });

    parser.on('end', async () => {
      if (!foundFiles) {
        reject(new Error(
          `No files found at path "${subpath}".\n` +
          `Please check that the path exists in the repository.`
        ));
      } else {
        // Wait for all file writes to complete
        await Promise.all(writePromises);
        resolve();
      }
    });

    parser.on('error', reject);
    nodeStream.pipe(parser);
  });
}
