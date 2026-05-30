# ejentum-mastra

[Mastra](https://mastra.ai) integration for the Ejentum Reasoning Harness. `createEjentumTools()` returns an object of eight Mastra `createTool` instances you pass as the `tools` field to `new Agent({ tools, ... })`. Each tool calls the Ejentum API and returns a structured injection the LLM consumes before generating its response.

Use the harness before the agent generates on complex, multi-step, or multi-constraint tasks where the model's default reasoning template would miss a constraint, take a shortcut, or drift across turns. Each call returns a *cognitive operation*: a structured procedure (numbered steps with a failure pattern to refuse and a falsification test) paired with an executable reasoning topology (a DAG of those steps with decision gates, parallel branches, bounded loops, and meta-cognitive exit nodes). The agent reads both layers before producing its response.

Four dynamic tools (`reasoning`, `code`, `anti-deception`, `memory`) are available on all tiers including the 30-day free trial. Four adaptive tools (`adaptive-reasoning`, `adaptive-code`, `adaptive-anti-deception`, `adaptive-memory`) additionally run an adapter LLM that rewrites the matched operation with task-specific identifiers; they require the Go or Super tier.

## Install

```bash
npm install ejentum-mastra
# peer deps
npm install @mastra/core zod
```

## Configuration

```bash
export EJENTUM_API_KEY="ej_..."
```

Or pass it explicitly: `createEjentumTools({ apiKey: "..." })`. Get a key at [ejentum.com/pricing](https://ejentum.com/pricing).

## Usage

```ts
import { Agent } from "@mastra/core/agent";
import { createEjentumTools } from "ejentum-mastra";

const architect = new Agent({
  id: "senior-architect",
  name: "Senior Architect",
  instructions: "Push back on sunk-cost framings.",
  model: "anthropic/claude-sonnet-4-6",
  tools: createEjentumTools(),
});

const response = await architect.generate(
  "We have spent three months on the GraphQL gateway. " +
  "Should we keep going or pivot to REST?",
);
```

### Pick a subset of tools

```ts
import { createReasoningTool, createAntiDeceptionTool } from "ejentum-mastra";

const tools = {
  reasoning: createReasoningTool(),
  antiDeception: createAntiDeceptionTool(),
};
```

The wrapper-object key is a developer-facing camelCase identifier; the LLM-facing tool name is the `id` field on each tool object.

## Tool inventory

| Wrapper key (camelCase) | Tool `id` (LLM-visible) | Mode string | Library size |
|---|---|---|---:|
| `reasoning` | `reasoning` | `reasoning` | 311 |
| `code` | `code` | `code` | 128 |
| `antiDeception` | `anti-deception` | `anti-deception` | 139 |
| `memory` | `memory` | `memory` | 101 |
| `adaptiveReasoning` | `adaptive-reasoning` | `adaptive-reasoning` | (same pool as reasoning) |
| `adaptiveCode` | `adaptive-code` | `adaptive-code` | (same pool as code) |
| `adaptiveAntiDeception` | `adaptive-anti-deception` | `adaptive-anti-deception` | (same pool as anti-deception) |
| `adaptiveMemory` | `adaptive-memory` | `adaptive-memory` | (same pool as memory) |

Each tool takes one parameter, `query: string`. The `execute` function returns `{ injection: string }`. Errors do not throw; they return as a human-readable string in the `injection` field.

## API reference

```ts
import { createEjentumTools, type EjentumConfig, type EjentumTools, type HarnessMode } from "ejentum-mastra";

createEjentumTools(config?: EjentumConfig): EjentumTools
```

| `EjentumConfig` field | Default | Description |
|---|---|---|
| `apiKey` | `process.env.EJENTUM_API_KEY` | API key. |
| `apiUrl` | `https://api.ejentum.com/harness/` | Override for self-hosted gateway. |
| `timeoutMs` | `10000` | Per-call HTTP timeout. |

Per-tool factories: `createReasoningTool`, `createCodeTool`, `createAntiDeceptionTool`, `createMemoryTool`, `createAdaptiveReasoningTool`, `createAdaptiveCodeTool`, `createAdaptiveAntiDeceptionTool`, `createAdaptiveMemoryTool`. Each accepts an `EjentumConfig` and returns a Mastra `createTool` result.

## Wire contract

`createEjentumTools()` issues:

```
POST https://api.ejentum.com/harness/
Headers: Authorization: Bearer <key>, Content-Type: application/json
Body:    { "query": <string>, "mode": <one of 8 mode strings> }
Response (200): [ { "<mode>": "<injection string>" } ]
```

Full wire contract, field structure, DAG syntax, and a canonical dynamic-vs-adaptive comparison on the same query are documented in the [ejentum-mcp README](https://github.com/ejentum/ejentum-mcp#wire-contract). The format is identical across this package and every Ejentum shim.

## ejentum-mcp alternative

Mastra ships an MCP client (`@mastra/mcp`). The same eight tools are exposed by the hosted MCP server:

```ts
import { MCPConfiguration } from "@mastra/mcp";

const mcp = new MCPConfiguration({
  servers: {
    ejentum: {
      url: new URL("https://api.ejentum.com/mcp"),
      requestInit: {
        headers: { Authorization: `Bearer ${process.env.EJENTUM_API_KEY}` },
      },
    },
  },
});
const tools = await mcp.getTools();
```

## Compatibility

- Node.js 18+
- `@mastra/core` 0.10+ (peer dep `>=0.10.0`)
- `zod` 3.x (peer dep `^3.23.0`)
- TypeScript 5.x

## License

[MIT](./LICENSE)
