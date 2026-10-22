import { RenderManifest } from "./types.js";

const COMMENT_MARKER = "<!-- osrs-coordinate-preview -->";
const COMMENT_IMAGE_WIDTH = 220;
const COMMENT_IMAGE_HEIGHT = 220;
// GitHub rejects comment bodies over 65536 characters.
const MAX_COMMENT_CHARS = 60000;
const PROJECT_REPO_URL = "https://github.com/collisionlab/osrs-coord-preview-action";

export function buildCommentBody(manifest: RenderManifest): string {
  return [COMMENT_MARKER, buildSummaryBody(manifest)].join("\n");
}

export function buildSummaryBody(manifest: RenderManifest): string {
  const lines = [
    `## 🗺️ [OSRS coordinate preview](${PROJECT_REPO_URL})`,
    "",
    `Rendered ${pluralize(manifest.renderCount, "preview")}; ${pluralize(manifest.failedCount, "failure")}.`,
    "",
    "| Preview | Item | Coordinate | Source |",
    "| --- | --- | --- | --- |"
  ];
  let length = lines.join("\n").length;
  let omitted = manifest.omittedCount ?? 0;

  for (const [index, item] of manifest.items.entries()) {
    const title = item.label ?? item.id;
    const source = item.source ?? "";
    const preview = item.status === "success" && item.imageUrl
      ? `<a href="${item.imageUrl}"><img src="${item.imageUrl}" alt="${escapeAttribute(title)}" width="${COMMENT_IMAGE_WIDTH}" height="${COMMENT_IMAGE_HEIGHT}" /></a>`
      : escapeCell(item.status === "failure" ? `failed: ${item.error}` : "");
    const row = `| ${preview} | ${escapeCell(title)} | ${escapeCell(item.coordinate)} | ${escapeCell(source)} |`;
    if (length + row.length + 1 > MAX_COMMENT_CHARS) {
      omitted += manifest.items.length - index;
      break;
    }
    lines.push(row);
    length += row.length + 1;
  }
  if (omitted > 0) {
    lines.push("", `…and ${pluralize(omitted, "more coordinate")} not shown.`);
  }

  return lines.join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
