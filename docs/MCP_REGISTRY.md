# Official MCP Registry packaging

This repo includes a `server.json` for the [Official MCP Registry](https://registry.modelcontextprotocol.io). The listing is **live** as [`io.github.AssistantMail/assistantmail-mcp`](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.AssistantMail/assistantmail-mcp) (status `active`). Product docs: [assistant-mail.ai/docs](https://assistant-mail.ai/docs).

The first publish is done. Use the steps below to **republish** after a version bump.

Directory form submits (Glama and other aggregators) are handled separately. This file covers in-repo registry packaging only.

## Files

| File | Role |
|---|---|
| [`server.json`](../server.json) | Registry metadata (schema `2025-12-11`) |
| [`package.json`](../package.json) `mcpName` | Must match `server.json` `name`. The registry checks this on the **published** npm package. |

Registry name: `io.github.AssistantMail/assistantmail-mcp` (GitHub org namespace). Website URL is `https://assistant-mail.ai/docs`.

Keep these in lockstep on every release:

- `package.json` `version`
- `server.json` `version`
- `server.json` `packages[0].version`
- `package.json` `mcpName` === `server.json` `name`

`npm run mcp:check` verifies that locally.

## Prerequisite: npm package must include `mcpName`

The registry fetches `@assistantmail/assistantmail-mcp` from npm and requires `mcpName` in that published `package.json`. The live listing already includes it. Future version bumps still need `mcpName` on the published npm package before you republish to the registry.

1. Bump `package.json` and `server.json` to the same new version.
2. Tag and publish to npm as usual (see [`.github/workflows/release.yml`](../.github/workflows/release.yml)).
3. Confirm the published tarball includes `"mcpName": "io.github.AssistantMail/assistantmail-mcp"`.
4. Then republish to the Official MCP Registry (below).

## Install `mcp-publisher`

```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
sudo mv mcp-publisher /usr/local/bin/
mcp-publisher --help
```

macOS via Homebrew: `brew install mcp-publisher`.

Docs: [Quickstart: Publish a Server](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx).

## Login and republish (manual)

GitHub auth grants the `io.github.AssistantMail/*` namespace only if the account is an **Owner** of the [AssistantMail](https://github.com/AssistantMail) org. Ordinary membership is not enough.

```bash
# from the repo root
npm run mcp:check
mcp-publisher validate
mcp-publisher login github
mcp-publisher publish
```

`login github` prints a device-code URL. Complete authorization in the browser, then return to the terminal.

Verify after a successful republish (the search should return the new version as `active`):

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.AssistantMail/assistantmail-mcp"
```

## Optional: GitHub Actions

[`.github/workflows/publish-mcp-registry.yml`](../.github/workflows/publish-mcp-registry.yml) is a **manual** (`workflow_dispatch`) stub. It uses GitHub OIDC (`mcp-publisher login github-oidc`) from this repository.

It does **not** run on tag push. Use it to republish after:

- An npm release that includes `mcpName` is published
- An AssistantMail org owner is prepared to approve the republish

## Not in scope

- Treating a version bump as live on the Official MCP Registry before `mcp-publisher publish` succeeds
- DNS / `ai.assistant-mail` namespace (would need domain auth on `assistant-mail.ai`)
- Aggregator directory forms
- Usage, MAU, or revenue claims
- Any official OpenClaw endorsement
