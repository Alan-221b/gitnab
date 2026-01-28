/**
 * Parsed repository information (provider-agnostic)
 */
export interface RepoInfo {
  owner: string;
  repo: string;
  ref: string;
  subpath: string;
}

/**
 * Git provider capabilities (Strategy Pattern)
 */
export interface GitProvider {
  /** Provider name for display */
  readonly name: string;

  /** Test if this provider can handle the given URL */
  canHandle(url: string): boolean;

  /** Parse URL into RepoInfo (throws if invalid) */
  parseUrl(url: string): RepoInfo;

  /** Build tarball download URL */
  getTarballUrl(info: RepoInfo): string;

  /** Build fetch headers */
  getHeaders(): Record<string, string>;

  /** Format error message for failed requests */
  formatError(info: RepoInfo, status: number, headers: Headers): string;
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
