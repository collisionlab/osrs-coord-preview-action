// Use the same HTTP client/runtime as the Action when checking public PNGs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [first, second] = await Promise.all(process.argv.slice(2).map(async file => JSON.parse(await fs.readFile(file, 'utf8'))));
for (const manifest of [first, second]) {
  assert.equal(manifest.renderCount, 2);
  assert.equal(manifest.failedCount, 0);
}
const urls = first.items.map(item => item.imageUrl);
assert.deepEqual(urls, second.items.map(item => item.imageUrl));
for (const url of urls) {
  assert.match(url, /^https:\/\/tiles\.collisionlab\.world\/previews\/images\/[a-f0-9]{64}\.png$/);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.match(response.headers.get('cache-control'), /immutable/);
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
}
console.log('Ground/upper-plane PNGs and repeated image identity passed.');
