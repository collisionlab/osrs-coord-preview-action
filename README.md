# OSRS Coordinate Preview Action

This repository contains the standalone GitHub Action client for the [CollisionLab coordinate renderer](https://github.com/collisionlab/osrs-coord-preview).

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

## Migration and releases

The original repository, Git history and tags are preserved. Existing `mpickering`
revisions continue to call the old renderer. This migration keeps all inputs and
outputs, the `osrs-coordinate-preview` comment tag and the HTML marker unchanged.
The `pr-number` and default GitHub token handling remain in the existing composite
comment action. No R2 or Google credentials are needed by this client.

The CollisionLab API is undergoing staged deployment. The new release is a
prerelease; use the `renderer-url` override with the existing endpoint during
acceptance testing. Do not update established consumers or move `v1` until the
public API and real PR comment create/update checks pass.

`npm test` builds the committed, self-contained `dist/index.js` bundle and runs
unit and isolated bundle/HTTP tests. CI checks the rebuilt bundle is unchanged.
Only `dist/index.js` and its module package metadata are published runtime
artefacts; consumers do not install npm dependencies. The Nix flake pins Node and
uses the same nixpkgs revision as the renderer and infrastructure repositories.

Release order: merge/test this client; tag `v1.5.0-rc.1`; run the external consumer
workflow in `collisionlab/osrs-tiles` with repository
`collisionlab/osrs-coord-preview-action` and that revision; verify the live public
API and PR comment create/update; then publish a stable tag and deliberately move
`v1`. Roll back consumers to their previous immutable revision if necessary. Do
not delete old releases, the old renderer or historical image storage.

Repository settings are managed by `collisionlab/infra` OpenTofu. This client
requires no new compute, storage, deployment secrets or infrastructure service.

The manual `Test standalone PR comment` workflow calls the packaged composite
Action twice on a specified PR and checks that exactly one comment remains with
the updated label. It exercises file input, inline precedence, `pr-number` and the
default GitHub token. Run it against an approved renderer before stable release.
