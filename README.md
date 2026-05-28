# ejentum-mastra

[Mastra](https://mastra.ai) integration for the [Ejentum](https://ejentum.com) Reasoning Harness. `createEjentumTools()` returns eight agent-callable tools you pass to `new Agent({ tools, ... })`: four dynamic (`reasoning`, `code`, `anti-deception`, `memory`) plus four adaptive (`adaptive-reasoning`, `adaptive-code`, `adaptive-anti-deception`, `adaptive-memory`) that pre-fit the cognitive operation to the caller's task via an adapter LLM.

Each operation in the Ejentum library (679 of them, organized across four cognitive harnesses each with dynamic and adaptive variants) is engineered in **two layers**:

- a **natural-language procedure** the model can read, naming the steps to take and the failure pattern to refuse, and
- an **executable reasoning topology**: a graph-shaped plan over those steps. The plan names explicit decision points where the model branches, parallel branches that run and rejoin, bounded loops that run until convergence, named meta-cognitive moments where the model is asked to stop, look at its own working, and re-enter at a specific step, plus escape paths for when the prescribed plan stops fitting the task at hand.

The natural-language layer tells the model *what* to do. The topology layer pins down *how* those steps connect: where to decide, where to loop, where to stop and look at itself. Together they act as a persistent attention anchor that survives long context windows and multi-turn execution chains, which is precisely where a model's own reasoning template typically decays.

## Installation

```bash
npm install ejentum-mastra
# peer deps (you almost certainly have these)
npm install @mastra/core zod
```

## Configuration

Get an Ejentum API key at <https://ejentum.com/pricing>. The 30-day free trial (no card required) includes 1,000 dynamic reasoning calls; adaptive tools require Go or Super.

```bash
export EJENTUM_API_KEY="ej_..."
```

Or pass it explicitly: `createEjentumTools({ apiKey: "..." })`.

## Usage

```ts
import { Agent } from "@mastra/core/agent";
import { createEjentumTools } from "ejentum-mastra";

const architect = new Agent({
  id: "senior-architect",
  name: "Senior Architect",
  instructions:
    "You are pragmatic and push back on sunk-cost framings. Call the " +
    "matching cognitive harness before generating.",
  model: "anthropic/claude-sonnet-4-6",
  tools: createEjentumTools(), // reads EJENTUM_API_KEY from env
});

const response = await architect.generate(
  "We've spent three months on the GraphQL gateway. " +
  "Should we keep going or pivot to REST?",
);

console.log(response.text);
```

The model reads each tool's description and routes to `anti-deception` on the sunk-cost framing, `reasoning` on a clean analytical question, etc.

### Pick a subset of harnesses

```ts
import { createReasoningTool, createAntiDeceptionTool } from "ejentum-mastra";

const tools = {
  reasoning: createReasoningTool(),
  antiDeception: createAntiDeceptionTool(),
  // ...your other non-Ejentum tools
};
```

> **Wrapper keys vs tool ids.** The object returned by `createEjentumTools()` uses camelCase developer-friendly keys (`reasoning, code, antiDeception, memory, adaptiveReasoning, adaptiveCode, adaptiveAntiDeception, adaptiveMemory`); the LLM-facing tool id is set on each tool's `id` field and matches the canonical hyphenated form (`anti-deception`, `adaptive-anti-deception`).

### Explicit API key

```ts
const tools = createEjentumTools({ apiKey: "ej_..." });
```

## The eight tools

### Dynamic (single retrieval, all tiers including the 30-day free trial)

| Wrapper key | Tool id (LLM-visible) | Best for | Library size |
|---|---|---|---|
| `reasoning` | `reasoning` | Analytical, diagnostic, planning, multi-step tasks | 311 operations |
| `code` | `code` | Code generation, refactoring, review, debugging | 128 operations |
| `antiDeception` | `anti-deception` | Prompts that pressure the agent to validate, certify, or soften an honest assessment | 139 operations |
| `memory` | `memory` | Sharpening an observation about cross-turn drift. Filter-oriented, not write-oriented. Format `query` as `"I noticed X. This might mean Y. Sharpen: Z."` | 101 operations |

### Adaptive (top-k retrieval + adapter LLM rewrites operation to fit the task; Go or Super tier required)

| Wrapper key | Tool id (LLM-visible) | When to prefer over the dynamic version |
|---|---|---|
| `adaptiveReasoning` | `adaptive-reasoning` | High-stakes analytical work where every DAG node should be mapped to your specifics before generation. Cost ~2-3s vs ~1s. |
| `adaptiveCode` | `adaptive-code` | Security-critical reviews, refactor-heavy diffs, or any code work where every verification step should be concretized. |
| `adaptiveAntiDeception` | `adaptive-anti-deception` | When the stakes of a soft or sycophantic answer are high; detection topology gates concretized to the exact pressure at play. |
| `adaptiveMemory` | `adaptive-memory` | When the dynamic memory tool's general scaffold is not sharp enough for the perception being formed. |

Each tool returns `{ injection: string }`. The bracketed labels in the returned injection (`[NEGATIVE GATE]`, `[PROCEDURE]`, `[REASONING TOPOLOGY]`, etc.) are instructions to the agent, not content to display.

## What an injection looks like

A real `reasoning` mode response on the query `investigate why our nightly ETL job has started failing intermittently over the past two weeks; nothing in the code or schema has changed`:

```
[NEGATIVE GATE]
The server's response time was accepted as average, despite a suspicious
rhythm break in its timing pattern.

[PROCEDURE]
Step 1: Establish baseline timing profiles by extracting historical
durations and intervals for each event type. Step 2: Compare each observed
timing against its baseline and compute deviation magnitude. ...

[REASONING TOPOLOGY]
S1:durations -> FIXED_POINT[baselines] -> N{dismiss_timing_deviations_
without_investigation} -> for_each: S2:compare -> S3:deviation ->
G1{>2sigma?} --yes-> S4:classify -> S5:probe_cause -> FLAG -> continue --no->
S6:validate -> continue -> all_checked -> OUT:anomaly_report

[FALSIFICATION TEST]
If no event timing is flagged as suspiciously fast or slow relative to
baseline, temporal anomaly detection was not active.

Amplify: timing baseline comparison; anomaly classification
Suppress: average timing acceptance; outlier normalization
```

The model reads both the `[PROCEDURE]` and the `[REASONING TOPOLOGY]` before generating its user-facing answer.

## API reference

```ts
import { createEjentumTools, type EjentumConfig } from "ejentum-mastra";

createEjentumTools(config?: EjentumConfig): EjentumTools
```

| Config field | Default | Description |
|---|---|---|
| `apiKey` | `process.env.EJENTUM_API_KEY` | Ejentum API key. |
| `apiUrl` | `https://api.ejentum.com/harness/` | Override only if you self-host the gateway. |
| `timeoutMs` | `10000` | Per-call HTTP timeout in milliseconds. |

Per-tool factories (all accept the same `EjentumConfig`):

- Dynamic: `createReasoningTool`, `createCodeTool`, `createAntiDeceptionTool`, `createMemoryTool`
- Adaptive: `createAdaptiveReasoningTool`, `createAdaptiveCodeTool`, `createAdaptiveAntiDeceptionTool`, `createAdaptiveMemoryTool`

## ejentum-mcp alternative

Mastra ships an MCP client (`@mastra/mcp`). If you'd rather wire the same eight tools via the Model Context Protocol:

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

This `ejentum-mastra` package is the lighter-deps direct path; the MCP server is the universal protocol path. Either works.

## Compatibility

- Node.js 18+
- `@mastra/core` 0.10+ (peer dep `>=0.10.0`)
- Zod 3.x (peer dep `^3.23.0`)
- TypeScript 5.x

## Resources

- Ejentum homepage: <https://ejentum.com>
- Pricing: <https://ejentum.com/pricing>
- API reference: <https://ejentum.com/docs/api_reference>
- "Why LLM Agents Fail" essay: <https://ejentum.com/blog/why-llm-agents-fail>
- "Under Pressure" research paper: <https://doi.org/10.5281/zenodo.19392715>
- Mastra documentation: <https://mastra.ai/docs>

## License

[MIT](./LICENSE)
