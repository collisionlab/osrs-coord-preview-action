import test from "node:test";
import assert from "node:assert/strict";
import { MAX_BATCH_BYTES, MAX_BATCH_ITEMS, splitBatches } from "../src/action.js";

test("splitBatches respects the renderer's item and byte limits", () => {
  const small = Array.from({ length: 151 }, (_, index) => ({ coordinate: "3200/3200/0", id: `c-${index}` }));
  assert.deepEqual(splitBatches(small).map(batch => batch.length), [50, 50, 50, 1]);
  const large = Array.from({ length: 50 }, (_, index) => ({ coordinate: "3200/3200/0", id: `c-${index}`, label: "x".repeat(2000) }));
  const batches = splitBatches(large);
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flat(), large);
  for (const batch of batches) {
    assert.ok(batch.length <= MAX_BATCH_ITEMS);
    assert.ok(Buffer.byteLength(JSON.stringify(batch)) <= MAX_BATCH_BYTES);
  }
});
