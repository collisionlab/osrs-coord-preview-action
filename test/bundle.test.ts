import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";

// Running only copied release files catches bundles that still require node_modules.
test("released bundle preserves file input, all outputs, partial failures and comment marker", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "preview-release-"));
  const payload = [{ coordinate: "3222/3218/3", id: "upper", label: "Upper floor" }, { coordinate: "0/0/2", id: "missing" }];
  let received: unknown;
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received = { method: request.method, path: request.url, body: JSON.parse(Buffer.concat(chunks).toString()) };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ renderCount: 1, failedCount: 1, items: [
      { ...payload[0], status: "success", imageUrl: "https://tiles.collisionlab.world/previews/images/fixture.png" },
      { ...payload[1], status: "failure", error: "Missing plane 2 source tile" },
    ] }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    for (const file of ["index.js", "package.json"]) await fs.copyFile(`dist/${file}`, path.join(directory, file));
    await fs.writeFile(path.join(directory, "coordinates.json"), JSON.stringify(payload));
    for (const file of ["outputs", "step-summary"]) await fs.writeFile(path.join(directory, file), "");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const child = spawn(process.execPath, [path.join(directory, "index.js")], {
      cwd: directory,
      env: { ...process.env, OSRS_COORDINATES: "", OSRS_COORDINATES_FILE: "coordinates.json",
        OSRS_RENDERER_URL: `http://127.0.0.1:${address.port}/render`, OSRS_OUTPUT_DIR: "previews",
        GITHUB_OUTPUT: path.join(directory, "outputs"), GITHUB_STEP_SUMMARY: path.join(directory, "step-summary") },
      timeout: 15_000,
    });
    let log = "";
    child.stdout.on("data", chunk => { log += chunk; });
    child.stderr.on("data", chunk => { log += chunk; });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.equal(code, 0, log);
    assert.deepEqual(received, { method: "POST", path: "/render", body: payload });
    const manifest = JSON.parse(await fs.readFile(path.join(directory, "previews/manifest.json"), "utf8"));
    assert.equal(manifest.renderCount, 1);
    assert.equal(manifest.failedCount, 1);
    assert.equal(manifest.items[1].error, "Missing plane 2 source tile");
    const outputs = await fs.readFile(path.join(directory, "outputs"), "utf8");
    for (const output of ["manifest_path", "comment_body_path", "summary_path", "render_count", "failed_count"]) {
      assert.match(outputs, new RegExp(`^${output}<<`, "m"));
    }
    const comment = await fs.readFile(path.join(directory, "previews/comment.md"), "utf8");
    assert.match(comment, /^<!-- osrs-coordinate-preview -->\n/);
    assert.match(comment, /Upper floor/);
    assert.match(comment, /Missing plane 2 source tile/);
    const summary = await fs.readFile(path.join(directory, "previews/summary.md"), "utf8");
    assert.doesNotMatch(summary, /<!-- osrs-coordinate-preview -->/);
    const action = await fs.readFile("action.yml", "utf8");
    assert.match(action, /default: https:\/\/tiles\.collisionlab\.world\/previews\/v1\/render/);
    assert.match(action, /comment-tag: osrs-coordinate-preview/);
    assert.match(action, /pr-number: \$\{\{ inputs\.pr-number \}\}/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
