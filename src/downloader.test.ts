import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import type { GitProvider, RepoInfo } from './types.js';
import { downloadTarball } from './downloader.js';

/**
 * Create a mock provider for testing
 */
function createMockProvider(tarballUrl: string): GitProvider {
  return {
    name: 'MockProvider',
    canHandle: () => true,
    parseUrl: () => ({ owner: 'test', repo: 'test', ref: 'main', subpath: 'src' }),
    getTarballUrl: () => tarballUrl,
    getHeaders: () => ({ 'User-Agent': 'test' }),
    formatError: (info: RepoInfo, status: number) => `Mock error: ${status}`,
  };
}

describe('downloadTarball', () => {
  it('should download successfully from HTTP server', async () => {
    // Create a simple HTTP server that returns test data
    const testData = 'test tarball content';
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(testData);
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${port}/test.tar.gz`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      const stream = await downloadTarball(provider, info);
      const reader = stream.getReader();
      const { value } = await reader.read();
      const content = new TextDecoder().decode(value);

      assert.strictEqual(content, testData);
    } finally {
      server.close();
    }
  });

  it('should follow redirects', async () => {
    const testData = 'redirected content';
    let redirectServer: ReturnType<typeof createServer>;
    let finalServer: ReturnType<typeof createServer>;

    // Final server with actual content
    finalServer = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(testData);
    });

    await new Promise<void>((resolve) => finalServer.listen(0, resolve));
    const finalPort = (finalServer.address() as { port: number }).port;

    // Redirect server
    redirectServer = createServer((req, res) => {
      res.writeHead(302, { Location: `http://localhost:${finalPort}/final.tar.gz` });
      res.end();
    });

    await new Promise<void>((resolve) => redirectServer.listen(0, resolve));
    const redirectPort = (redirectServer.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${redirectPort}/redirect`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      const stream = await downloadTarball(provider, info);
      const reader = stream.getReader();
      const { value } = await reader.read();
      const content = new TextDecoder().decode(value);

      assert.strictEqual(content, testData);
    } finally {
      redirectServer.close();
      finalServer.close();
    }
  });

  it('should handle HTTP errors', async () => {
    const server = createServer((req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${port}/notfound`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      await assert.rejects(
        () => downloadTarball(provider, info),
        /Mock error: 404/
      );
    } finally {
      server.close();
    }
  });

  it('should handle network errors', async () => {
    // Use a valid URL format but unreachable address
    const provider = createMockProvider('http://127.0.0.1:1/invalid');
    const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

    await assert.rejects(
      () => downloadTarball(provider, info),
      /Network error/
    );
  });

  it('should handle multiple redirects', async () => {
    const testData = 'final destination';
    let server1: ReturnType<typeof createServer>;
    let server2: ReturnType<typeof createServer>;
    let server3: ReturnType<typeof createServer>;

    // Final server
    server3 = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(testData);
    });
    await new Promise<void>((resolve) => server3.listen(0, resolve));
    const port3 = (server3.address() as { port: number }).port;

    // Second redirect
    server2 = createServer((req, res) => {
      res.writeHead(301, { Location: `http://localhost:${port3}/final` });
      res.end();
    });
    await new Promise<void>((resolve) => server2.listen(0, resolve));
    const port2 = (server2.address() as { port: number }).port;

    // First redirect
    server1 = createServer((req, res) => {
      res.writeHead(302, { Location: `http://localhost:${port2}/middle` });
      res.end();
    });
    await new Promise<void>((resolve) => server1.listen(0, resolve));
    const port1 = (server1.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${port1}/start`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      const stream = await downloadTarball(provider, info);
      const reader = stream.getReader();
      const { value } = await reader.read();
      const content = new TextDecoder().decode(value);

      assert.strictEqual(content, testData);
    } finally {
      server1.close();
      server2.close();
      server3.close();
    }
  });

  it('should handle 500 server errors', async () => {
    const server = createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${port}/error`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      await assert.rejects(
        () => downloadTarball(provider, info),
        /Mock error: 500/
      );
    } finally {
      server.close();
    }
  });

  it('should handle HTTP error after redirect', async () => {
    let redirectServer: ReturnType<typeof createServer>;
    let errorServer: ReturnType<typeof createServer>;

    // Server that returns 404
    errorServer = createServer((req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    await new Promise<void>((resolve) => errorServer.listen(0, resolve));
    const errorPort = (errorServer.address() as { port: number }).port;

    // Redirect server pointing to error server
    redirectServer = createServer((req, res) => {
      res.writeHead(302, { Location: `http://localhost:${errorPort}/notfound` });
      res.end();
    });

    await new Promise<void>((resolve) => redirectServer.listen(0, resolve));
    const redirectPort = (redirectServer.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${redirectPort}/redirect`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      await assert.rejects(
        () => downloadTarball(provider, info),
        /HTTP error: 404/
      );
    } finally {
      redirectServer.close();
      errorServer.close();
    }
  });

  it('should handle network error after redirect', async () => {
    // Redirect server pointing to unreachable address
    const redirectServer = createServer((req, res) => {
      res.writeHead(302, { Location: 'http://127.0.0.1:1/unreachable' });
      res.end();
    });

    await new Promise<void>((resolve) => redirectServer.listen(0, resolve));
    const redirectPort = (redirectServer.address() as { port: number }).port;

    try {
      const provider = createMockProvider(`http://localhost:${redirectPort}/redirect`);
      const info: RepoInfo = { owner: 'test', repo: 'test', ref: 'main', subpath: 'src' };

      await assert.rejects(
        () => downloadTarball(provider, info),
        /Network error/
      );
    } finally {
      redirectServer.close();
    }
  });
});
