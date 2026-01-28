import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { parseGitHubUrl } from './github-url.js';
import { downloadTarball } from './downloader.js';
import { extractTarball } from './extractor.js';
import type { CliOptions } from './types.js';

const VERSION = '1.0.0';

const HELP_TEXT = `
gitnab - Nab just what you need from any GitHub repo

Usage: gitnab <github-url> [destination]

Arguments:
  github-url   GitHub URL with path
               e.g., https://github.com/owner/repo/tree/main/path/to/folder
               or shorthand: owner/repo/path/to/folder (defaults to main branch)
  destination  Output directory (default: current directory)

Options:
  -k, --keep-folder-name  Keep the folder name in output
                          Without: files extracted directly to destination
                          With: creates subfolder with the folder name
  -o, --output <dir>      Output directory (alternative to positional arg)
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  # Extract examples folder to current directory
  gitnab https://github.com/owner/repo/tree/main/examples .

  # Extract and keep the folder name
  gitnab -k https://github.com/owner/repo/tree/main/src/components

  # Use shorthand (defaults to main branch)
  gitnab owner/repo/examples ./my-examples
`.trim();

/**
 * Parse command line arguments
 */
function parseCliArgs(): CliOptions {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'keep-folder-name': {
        type: 'boolean',
        short: 'k',
        default: false,
      },
      output: {
        type: 'string',
        short: 'o',
      },
      help: {
        type: 'boolean',
        short: 'h',
        default: false,
      },
      version: {
        type: 'boolean',
        short: 'v',
        default: false,
      },
    },
  });

  const url = positionals[0] || '';
  const destination = values.output || positionals[1] || '.';

  return {
    url,
    destination: resolve(destination),
    keepFolderName: values['keep-folder-name'] || false,
    help: values.help || false,
    version: values.version || false,
  };
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  try {
    const options = parseCliArgs();

    if (options.help) {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (options.version) {
      console.log(VERSION);
      process.exit(0);
    }

    if (!options.url) {
      console.error('Error: GitHub URL is required.\n');
      console.log(HELP_TEXT);
      process.exit(1);
    }

    // Parse the GitHub URL
    console.log('Parsing GitHub URL...');
    const repoInfo = parseGitHubUrl(options.url);
    console.log(`  Repository: ${repoInfo.owner}/${repoInfo.repo}`);
    console.log(`  Branch/Tag: ${repoInfo.ref}`);
    console.log(`  Path: ${repoInfo.subpath}`);

    // Download the tarball
    console.log('\nDownloading tarball...');
    const stream = await downloadTarball(repoInfo);

    // Extract the files
    console.log('Extracting files...');
    await extractTarball(stream, {
      destination: options.destination,
      subpath: repoInfo.subpath,
      keepFolderName: options.keepFolderName,
    });

    const folderName = repoInfo.subpath.split('/').pop();
    const outputPath = options.keepFolderName
      ? `${options.destination}/${folderName}`
      : options.destination;

    console.log(`\nDone! Files extracted to: ${outputPath}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
    } else {
      console.error('\nAn unexpected error occurred');
    }
    process.exit(1);
  }
}

main();
