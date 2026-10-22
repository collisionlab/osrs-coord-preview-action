import fs from "node:fs/promises";
import path from "node:path";
import * as core from "@actions/core";
import { buildCommentBody, buildSummaryBody } from "./comment.js";
import { validateCoordinatesPayload } from "./input.js";
import { RenderManifest, RenderResult, RenderServiceResponse } from "./types.js";

export interface ActionOptions {
  coordinatesRaw: string;
  rendererUrl: string;
  outputDir: string;
  maxPreviews?: number;
}

// Must not exceed the renderer's per-request limits (osrs-coord-preview src/config.ts).
export const MAX_BATCH_ITEMS = 50;
export const MAX_BATCH_BYTES = 65536;
export const DEFAULT_MAX_PREVIEWS = 50;

export async function runAction(options: ActionOptions): Promise<void> {
  validateCoordinatesPayload(options.coordinatesRaw);

  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const items = JSON.parse(options.coordinatesRaw) as unknown[];
  const shown = items.slice(0, options.maxPreviews ?? DEFAULT_MAX_PREVIEWS);
  const manifest = await requestRemoteRender(options.rendererUrl, shown);
  manifest.omittedCount = items.length - shown.length;
  const manifestPath = path.join(outputDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  const commentBodyPath = path.join(outputDir, "comment.md");
  await fs.writeFile(commentBodyPath, buildCommentBody(manifest));
  const summaryPath = path.join(outputDir, "summary.md");
  await fs.writeFile(summaryPath, buildSummaryBody(manifest));

  core.setOutput("manifest_path", manifestPath);
  core.setOutput("comment_body_path", commentBodyPath);
  core.setOutput("summary_path", summaryPath);
  core.setOutput("render_count", String(manifest.renderCount));
  core.setOutput("failed_count", String(manifest.failedCount));
  core.setOutput("omitted_count", String(manifest.omittedCount));
  core.summary.addHeading("OSRS coordinate previews");
  core.summary.addRaw(`Rendered ${manifest.renderCount} preview(s); ${manifest.failedCount} failure(s); ${manifest.omittedCount} omitted.`);
  await core.summary.write();

  if (manifest.failedCount > 0) {
    core.warning(`Failed to render ${manifest.failedCount} coordinate ${manifest.failedCount === 1 ? "preview" : "previews"}. See manifest and PR comment for details.`);
  }
}

export function splitBatches(items: unknown[]): unknown[][] {
  const batches: unknown[][] = [];
  let batch: unknown[] = [];
  let bytes = 2;
  for (const item of items) {
    const size = Buffer.byteLength(JSON.stringify(item)) + 1;
    if (batch.length > 0 && (batch.length >= MAX_BATCH_ITEMS || bytes + size > MAX_BATCH_BYTES)) {
      batches.push(batch);
      batch = [];
      bytes = 2;
    }
    batch.push(item);
    bytes += size;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

async function requestRemoteRender(rendererUrl: string, items: unknown[]): Promise<RenderManifest> {
  const results: RenderResult[] = [];
  for (const batch of splitBatches(items)) results.push(...(await requestBatch(rendererUrl, batch)).items);
  return {
    tileBaseUrl: "remote-renderer",
    generatedAt: new Date().toISOString(),
    renderCount: results.filter(item => item.status === "success").length,
    failedCount: results.filter(item => item.status === "failure").length,
    omittedCount: 0,
    items: results
  };
}

async function requestBatch(rendererUrl: string, batch: unknown[], attempt = 1): Promise<RenderServiceResponse> {
  const response = await fetch(rendererUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(batch)
  });

  if (response.status === 429 && attempt < 3) {
    const seconds = Math.min(Number(response.headers.get("retry-after")) || 10, 60);
    core.info(`Renderer is rate limiting; retrying in ${seconds}s.`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return requestBatch(rendererUrl, batch, attempt + 1);
  }
  if (!response.ok) {
    const detail = await response.json().then(body => (body as { error?: string }).error, () => undefined);
    throw new Error(`Renderer request failed: ${response.status} ${response.statusText}${detail ? `: ${detail}` : ""}`);
  }
  return await response.json() as RenderServiceResponse;
}
