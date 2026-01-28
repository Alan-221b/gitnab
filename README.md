# gitnab

> Nab just what you need from any GitHub repo

A CLI tool to extract a subfolder from a GitHub repository into your current directory (or any destination).

## Installation

```bash
# Use directly with npx (no installation required)
npx gitnab <github-url> [destination]

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

# Use shorthand (defaults to main branch)
npx gitnab owner/repo/path/to/folder
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--keep-folder-name` | `-k` | Keep the folder name in output |
| `--output <dir>` | `-o` | Output directory (alternative to positional arg) |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

## URL Formats

### Full GitHub URL
```
https://github.com/owner/repo/tree/branch/path/to/folder
```

### Shorthand (defaults to main branch)
```
owner/repo/path/to/folder
```

## Examples

### Extract Next.js examples
```bash
npx gitnab https://github.com/vercel/next.js/tree/canary/examples/hello-world .
```

### Extract and keep folder structure
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

1. Parses the GitHub URL to extract owner, repo, branch, and path
2. Downloads the repository tarball from GitHub's API
3. Streams and extracts only the files within the requested subfolder
4. Writes files to the destination directory

## License

MIT
