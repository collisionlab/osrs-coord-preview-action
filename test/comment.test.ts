import test from "node:test";
import assert from "node:assert/strict";
import { buildCommentBody, buildSummaryBody } from "../src/comment.js";
import { RenderManifest } from "../src/types.js";

test("buildCommentBody includes image urls", () => {
  const manifest: RenderManifest = {
    tileBaseUrl: "remote-renderer",
    generatedAt: new Date().toISOString(),
    renderCount: 1,
    failedCount: 0,
    items: [
      {
        status: "success",
        id: "step-1",
        label: "Step 1",
        coordinate: "3200/3200/0",
        source: "steps.json:4",
        resolved: { tileX: 12, tileY: 12, pixelX: 128, pixelY: 127 },
        imageUrl: "https://storage.googleapis.com/example-bucket/renders/hash/step-1.png"
      }
    ]
  };

  const body = buildCommentBody(manifest);
  assert.match(body, /^<!-- osrs-coordinate-preview -->\n/);
  assert.match(body, /OSRS coordinate preview/);
  assert.match(body, /🗺️/);
  assert.match(body, /Rendered 1 preview; 0 failures\./);
  assert.match(body, /github\.com\/collisionlab\/osrs-coord-preview-action/);
  assert.match(body, /Step 1/);
  assert.match(body, /storage\.googleapis\.com\/example-bucket/);
  assert.match(body, /width="220"/);
  assert.match(body, /height="220"/);
});

test("buildSummaryBody omits the comment marker", () => {
  const manifest: RenderManifest = {
    tileBaseUrl: "remote-renderer",
    generatedAt: new Date().toISOString(),
    renderCount: 0,
    failedCount: 1,
    items: [
      {
        status: "failure",
        id: "step-1",
        coordinate: "3200/3200/0",
        error: "bad tile"
      }
    ]
  };

  const body = buildSummaryBody(manifest);
  assert.doesNotMatch(body, /<!-- osrs-coordinate-preview -->/);
  assert.match(body, /failed: bad tile/);
});
