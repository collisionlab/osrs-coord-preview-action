import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveCoordinatesPayload, validateCoordinatesPayload } from "../src/input.js";

test("inline coordinates take precedence over a file", async () => {
  assert.equal(await resolveCoordinatesPayload({ coordinatesRaw: " [] ", coordinatesFile: "absent.json" }), "[]");
});

test("coordinates-file is trimmed and read without production credentials", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "preview-input-"));
  try {
    const file = path.join(directory, "coordinates.json");
    await fs.writeFile(file, '  [{"coordinate":"3222/3218/3"}]\n');
    const payload = await resolveCoordinatesPayload({ coordinatesFile: file });
    assert.equal(payload, '[{"coordinate":"3222/3218/3"}]');
    assert.doesNotThrow(() => validateCoordinatesPayload(payload));
    await fs.writeFile(file, " ");
    await assert.rejects(resolveCoordinatesPayload({ coordinatesFile: file }), /empty/);
    await fs.unlink(file);
    await assert.rejects(resolveCoordinatesPayload({ coordinatesFile: file }), /Failed to read/);
    await assert.rejects(resolveCoordinatesPayload({}), /must be provided/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("coordinate payload format is validated before sending", () => {
  for (const raw of ["no json", "{}", "[]", "[null]", '[{"coordinate":"3222/3218"}]']) {
    assert.throws(() => validateCoordinatesPayload(raw));
  }
  assert.doesNotThrow(() => validateCoordinatesPayload('[{"coordinate":"3222/3218/0"},{"coordinate":"3222/3218/3"}]'));
});
