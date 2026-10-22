import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageCloudflare } from '../scripts/package-cloudflare.mjs';

test('Cloudflare package serves the complete game without external asset requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'touchline-cf-'));
  try {
    const input = join(root, 'dist'),
      output = join(root, 'cloudflare');
    await mkdir(join(input, 'assets'), { recursive: true });
    await writeFile(
      join(input, 'index.html'),
      '<!doctype html><html><head><link rel="stylesheet" href="/assets/app.css"><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>',
    );
    await writeFile(
      join(input, 'assets/app.css'),
      '@font-face{font-family:test;src:url(./font.woff2)}body{color:green}',
    );
    await writeFile(
      join(input, 'assets/app.js'),
      'document.title="Touchline test";const marker="$& $$typeof";',
    );
    await writeFile(
      join(input, 'assets/font.woff2'),
      Buffer.from([0, 1, 2, 3]),
    );
    await packageCloudflare(input, output);
    const worker = (
      await import(pathToFileURL(join(output, '_worker.js')).href)
    ).default;
    const response = await worker.fetch(new Request('https://example.com/'));
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.ok(html.includes('data:font/woff2;base64,AAECAw=='));
    assert.ok(html.includes('document.title="Touchline test";'));
    assert.ok(html.includes('const marker="$& $$typeof";'));
    assert.ok(!html.includes('src="/assets/'));
    assert.ok(!html.includes('href="/assets/'));
    const head = await worker.fetch(
      new Request('https://example.com/', { method: 'HEAD' }),
    );
    assert.equal(await head.text(), '');
    assert.equal(head.headers.get('etag'), response.headers.get('etag'));
    assert.equal(
      (await worker.fetch(new Request('https://example.com/assets/missing.js')))
        .status,
      404,
    );
    assert.equal(
      (
        await worker.fetch(
          new Request('https://example.com/', { method: 'POST' }),
        )
      ).status,
      405,
    );
    assert.ok(
      (await readFile(join(output, 'index.html'), 'utf8')).includes(
        'Touchline test',
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
