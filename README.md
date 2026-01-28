# gitnab

[![npm version](https://img.shields.io/npm/v/gitnab.svg)](https://www.npmjs.com/package/gitnab)
[![CI](https://github.com/Alan-221b/gitnab/actions/workflows/ci.yml/badge.svg)](https://github.com/Alan-221b/gitnab/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Alan-221b_gitnab&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Alan-221b_gitnab)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=Alan-221b_gitnab&metric=coverage)](https://sonarcloud.io/summary/new_code?id=Alan-221b_gitnab)

> Nab just what you need from any Git repo

A CLI tool to extract a subfolder from GitHub or GitLab repositories into your current directory (or any destination).

## Installation

```bash
# Use directly with npx (no installation required)
npx gitnab <url> [destination]

# Or install globally
npm install -g gitnab
```

## Usage

```bash
# Extract a folder to current directory
npx gitnab https://github.com/owner/repo/tree/main/examples .

# Extract to a specific directory
npx gitnab https://github.com/owner/repo/tree/main/src/components ./my-components

# Keep the folder name in output
npx gitnab -k https://github.com/owner/repo/tree/main/examples
# Creates ./examples/ directory
```

## Supported Platforms

### GitHub
```bash
npx gitnab https://github.com/owner/repo/tree/branch/path/to/folder
```

### GitLab
```bash
npx gitnab https://gitlab.com/namespace/project/-/tree/branch/path/to/folder
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--keep-folder-name` | `-k` | Keep the folder name in output |
| `--output <dir>` | `-o` | Output directory (alternative to positional arg) |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

## Examples

### Extract Next.js examples from GitHub
```bash
npx gitnab https://github.com/vercel/next.js/tree/canary/examples/hello-world .
```

### Extract GitLab documentation
```bash
npx gitnab https://gitlab.com/gitlab-org/gitlab/-/tree/master/doc/api ./gitlab-docs
```

### Keep folder structure
```bash
npx gitnab -k https://github.com/facebook/react/tree/main/packages/react
# Creates ./react/ directory with contents
```

### Use with different branches/tags
```bash
# From a specific branch
npx gitnab https://github.com/owner/repo/tree/develop/src/utils .

# From a tag
npx gitnab https://github.com/owner/repo/tree/v1.0.0/examples .
```

## Requirements

- Node.js 18 or higher (uses native fetch)

## How It Works

1. Parses the URL to detect the platform (GitHub or GitLab)
2. Extracts owner, repo, branch, and path from the URL
3. Downloads the repository tarball from the platform's API
4. Streams and extracts only the files within the requested subfolder
5. Writes files to the destination directory

## License

MIT
