# OSRS Coordinate Preview Action

This is the canonical published GitHub Action client for the [CollisionLab coordinate renderer](https://github.com/collisionlab/osrs-coord-preview).

## What it does

The action:

- accepts a batch JSON payload of OSRS coordinates
- sends that payload to a hosted renderer service
- writes local `manifest.json`, `comment.md`, and `summary.md` files
- optionally posts or updates a PR comment using `thollander/actions-comment-pull-request@v3`

It does not render locally. Local rendering remains in the main repo CLI and service code.

## Inputs

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `coordinates` | `string` | Conditionally | JSON array of coordinate items. Takes precedence over `coordinates-file` when both are set. |
| `coordinates-file` | `string` | Conditionally | Relative or absolute path to a file containing the JSON array payload. |
| `renderer-url` | `string` | No | Full `POST /render` endpoint. Defaults to `https://tiles.collisionlab.world/previews/v1/render`. |
| `comment` | `boolean` | No | Enable PR comment creation/update. Default `false`. |
| `pr-number` | `string` | No | Pull request number to comment on. Useful outside direct PR-triggered workflows. |
| `github-token` | `string` | No | Token passed to the comment action when `comment` is `true`. Defaults to `${{ github.token }}`. |
| `output-dir` | `string` | No | Directory where `manifest.json`, `comment.md`, and `summary.md` are written. Default `.osrs-coordinate-preview`. |

Provide either `coordinates` or `coordinates-file`.

## Outputs

| Name | Description |
| --- | --- |
| `manifest_path` | Path to the generated local `manifest.json`. |
| `comment_body_path` | Path to the generated `comment.md` file used for PR commenting. |
| `summary_path` | Path to the generated `summary.md` file that can be reused or uploaded as an artifact. |
| `render_count` | Number of successful renders returned by the renderer. |
| `failed_count` | Number of failed renders returned by the renderer. |

## Example

```yaml
- uses: collisionlab/osrs-coord-preview-action@v1.5.0-rc.1
  with:
    coordinates: ${{ steps.coords.outputs.coordinates }}
    comment: "true"
    github-token: ${{ github.token }}
```

```yaml
- uses: collisionlab/osrs-coord-preview-action@v1.5.0-rc.1
  with:
    coordinates-file: .github/osrs/coordinates.json
    comment: "true"
    pr-number: 123
    github-token: ${{ github.token }}
```

```yaml
- id: previews
  uses: collisionlab/osrs-coord-preview-action@v1.5.0-rc.1
  with:
    coordinates-file: .github/osrs/coordinates.json

- uses: actions/upload-artifact@v4
  with:
    name: osrs-coordinate-preview-summary
    path: ${{ steps.previews.outputs.summary_path }}
```

## Development

```bash
nix develop
npm ci
npm test
```

`npm run build` compiles the TypeScript sources and bundles the published action entrypoint into `dist/index.js`.

## Checks and releases

`nix develop -c npm test` rebuilds the self-contained bundle and runs unit and
isolated HTTP tests. PR CI also runs `uses: ./` against a controlled renderer and
checks the manifest, image URL, comment marker, comment body and job summary.
No production credentials are needed. The manual PR-comment workflow verifies
comment create/update; the `test-pr-comment` label enables that check on local PRs.

The `live` workflow runs on main and weekly once `PREVIEW_PUBLIC_LIVE=true` is
set after public-route acceptance. It renders ground and upper planes, downloads
both PNGs and verifies stable identities across repeated requests. Infra owns the
authenticated cache-miss smoke for Cloud Run and R2.

Published runtime files are `dist/index.js` and `dist/package.json`; consumers do
not install dependencies or receive cloud credentials. Existing released tags and
legacy `mpickering/*` consumers remain unchanged. Publishing `v1.5.0` or moving
`v1` requires an explicit release decision after live and PR-comment checks pass.
Repository settings are managed by `collisionlab/infra`.
