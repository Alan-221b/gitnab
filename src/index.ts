import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { parseUrl } from './providers.js';
import { downloadTarball } from './downloader.js';
import { extractTarball } from './extractor.js';
import type { CliOptions } from './types.js';

const VERSION = '1.1.0';

const HELP_TEXT = `
gitnab - Nab just what you need from any Git repo

Usage: gitnab <url> [destination]

Arguments:
  url          Repository URL with path to subfolder
  destination  Output directory (default: current directory)

Supported Platforms:
  GitHub: https://github.com/owner/repo/tree/branch/path
  GitLab: https://gitlab.com/namespace/project/-/tree/branch/path

Options:
  -k, --keep-folder-name  Keep the folder name in output
                          Without: files extracted directly to destination
                          With: creates subfolder with the folder name
  -o, --output <dir>      Output directory (alternative to positional arg)
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  # Extract from GitHub
  gitnab https://github.com/vercel/next.js/tree/canary/examples/hello-world .

  # Extract from GitLab
  gitnab https://gitlab.com/gitlab-org/gitlab/-/tree/master/doc/api .

  # Keep the folder name
  gitnab -k https://github.com/owner/repo/tree/main/src/components
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
      console.error('Error: Repository URL is required.\n');
      console.log(HELP_TEXT);
      process.exit(1);
    }

    // Parse the URL and detect provider
    console.log('Parsing URL...');
    const { provider, info } = parseUrl(options.url);
    console.log(`  Provider: ${provider.name}`);
    console.log(`  Repository: ${info.owner}/${info.repo}`);
    console.log(`  Branch/Tag: ${info.ref}`);
    console.log(`  Path: ${info.subpath}`);

    // Download the tarball
    console.log('\nDownloading tarball...');
    const stream = await downloadTarball(provider, info);

    // Extract the files
    console.log('Extracting files...');
    await extractTarball(stream, {
      destination: options.destination,
      subpath: info.subpath,
      keepFolderName: options.keepFolderName,
    });

    const folderName = info.subpath.split('/').pop();
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
