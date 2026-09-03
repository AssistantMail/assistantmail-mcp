# Official MCP Registry packaging

This repo includes a `server.json` so [Assistant Mail MCP](https://github.com/AssistantMail/assistantmail-mcp) can be published to the [Official MCP Registry](https://registry.modelcontextprotocol.io). The listing is **not live** until someone with GitHub org ownership (Daylon / an AssistantMail org owner) authenticates and runs `mcp-publisher publish`.

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

The registry fetches `@assistantmail/assistantmail-mcp` from npm and requires `mcpName` in that published `package.json`. A version already on npm **without** `mcpName` cannot be used for the first registry publish.

1. Bump `package.json` and `server.json` to the same new version.
2. Tag and publish to npm as usual (see [`.github/workflows/release.yml`](../.github/workflows/release.yml)).
3. Confirm the published tarball includes `"mcpName": "io.github.AssistantMail/assistantmail-mcp"`.
4. Then publish to the Official MCP Registry (below).

## Install `mcp-publisher`

```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
sudo mv mcp-publisher /usr/local/bin/
mcp-publisher --help
```

macOS via Homebrew: `brew install mcp-publisher`.

Docs: [Quickstart: Publish a Server](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx).

## Login and publish (manual)

GitHub auth grants the `io.github.AssistantMail/*` namespace only if the account is an **Owner** of the [AssistantMail](https://github.com/AssistantMail) org. Ordinary membership is not enough.

```bash
# from the repo root
npm run mcp:check
mcp-publisher validate
mcp-publisher login github
mcp-publisher publish
```

`login github` prints a device-code URL. Complete authorization in the browser, then return to the terminal.

Verify after a successful publish (do not treat this as live until this search returns the server):

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.AssistantMail/assistantmail-mcp"
```

## Optional: GitHub Actions

[`.github/workflows/publish-mcp-registry.yml`](../.github/workflows/publish-mcp-registry.yml) is a **manual** (`workflow_dispatch`) stub. It uses GitHub OIDC (`mcp-publisher login github-oidc`) from this repository.

It does **not** run on tag push. Enable it only after:

- An npm release that includes `mcpName` is published
- An AssistantMail org owner is prepared to approve the first publish

## Not in scope

- Claiming the Official MCP Registry listing is live before `mcp-publisher publish` succeeds
- DNS / `ai.assistant-mail` namespace (would need domain auth on `assistant-mail.ai`)
- Aggregator directory forms
- Usage, MAU, or revenue claims
- Any official OpenClaw endorsement
