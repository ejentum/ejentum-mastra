# Changelog

All notable changes to `ejentum-mastra` are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-23

### Added

- Initial release.
- `createEjentumTools(config)` factory returns the four Ejentum harness tools as an object keyed by `harnessReasoning`, `harnessCode`, `harnessAntiDeception`, `harnessMemory`. Pass it directly to `new Agent({ tools, ... })` from `@mastra/core/agent`.
- Per-tool factories also exported: `createReasoningTool`, `createCodeTool`, `createAntiDeceptionTool`, `createMemoryTool`. Use these when mixing one Ejentum tool with non-Ejentum tools.
- Built on Mastra's `createTool({ id, description, inputSchema, outputSchema, execute })` primitive from `@mastra/core/tools`. Each tool has a Zod `inputSchema` for `query` (`string`, `min(1)`) and a Zod `outputSchema` wrapping the scaffold as `{ scaffold: string }`.
- Native `fetch` (Node 18+) with `AbortController`-based timeout. No HTTP-client dep weight beyond `@mastra/core` and `zod` (both peer deps).
- Construction-time and call-time validation: empty/whitespace query returns an actionable error without spending a paid API call. Missing `EJENTUM_API_KEY` returns an actionable error pointing to https://ejentum.com/pricing.
- Errors returned as human-readable strings inside the `scaffold` output for every failure path (no exceptions cross the tool boundary, so a step never crashes the run).
- TypeScript-first with declaration files (`.d.ts`) and source maps. Strict mode enabled.
- Unit tests via vitest cover the call-helper failure surface (missing key, empty/whitespace/non-string query, invalid mode, 401, non-200, invalid JSON, unexpected shape, non-string scaffold, network error) plus the tool factory contract (four named tools with `id` / `description` / `execute`, distinct ids, callable execute).
- Published to npm with `--provenance` provenance attestation via GitHub Actions OIDC.

### Background

Mastra's `createTool` primitive requires both `inputSchema` and `outputSchema` (unlike Vercel AI SDK's `tool()` which has only `parameters`). This package returns the scaffold wrapped in `{ scaffold: string }` so the Mastra Agent reads it via `output.scaffold`. The Ejentum MCP server (`ejentum-mcp`) is also consumable from Mastra via Mastra's MCP client (`@mastra/mcp`); this package is the lighter-deps alternative.
