import * as core from "@actions/core";
import { runAction } from "./action.js";
import { resolveCoordinatesPayload } from "./input.js";

function getActionInput(name: string, envName: string): string {
  return core.getInput(name) || process.env[envName] || "";
}

function parseMaxPreviews(raw: string): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error("max-previews must be a positive integer.");
  return value;
}

async function main() {
  try {
    const coordinatesRaw = await resolveCoordinatesPayload({
      coordinatesRaw: getActionInput("coordinates", "OSRS_COORDINATES"),
      coordinatesFile: getActionInput("coordinates-file", "OSRS_COORDINATES_FILE")
    });

    await runAction({
      coordinatesRaw,
      rendererUrl: getActionInput("renderer-url", "OSRS_RENDERER_URL") || "https://tiles.collisionlab.world/previews/v1/render",
      outputDir: getActionInput("output-dir", "OSRS_OUTPUT_DIR") || ".osrs-coordinate-preview",
      maxPreviews: parseMaxPreviews(getActionInput("max-previews", "OSRS_MAX_PREVIEWS"))
    });
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

void main();
