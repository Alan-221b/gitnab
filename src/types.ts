/**
 * Parsed GitHub URL information
 */
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
}

/**
 * CLI options parsed from command line arguments
 */
export interface CliOptions {
  url: string;
  destination: string;
  keepFolderName: boolean;
  help: boolean;
  version: boolean;
}

/**
 * Extraction options passed to the extractor
 */
export interface ExtractOptions {
  destination: string;
  subpath: string;
  keepFolderName: boolean;
}
