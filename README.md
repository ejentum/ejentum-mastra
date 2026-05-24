# ejentum-mastra

[Mastra](https://mastra.ai) integration for the [Ejentum](https://ejentum.com) Reasoning Harness. `createEjentumTools()` returns four agent-callable tools (`harnessReasoning`, `harnessCode`, `harnessAntiDeception`, `harnessMemory`) you pass to `new Agent({ tools, ... })`.

Each operation in the Ejentum library (679 of them, organized across four harnesses) is engineered in **two layers**:

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

Get an Ejentum API key at <https://ejentum.com/pricing> (free and paid tiers) and set it in your environment:

```bash
export EJENTUM_API_KEY="zpka_..."
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
    "matching harness_* tool before generating.",
  model: "anthropic/claude-sonnet-4-6",
  tools: createEjentumTools(), // reads EJENTUM_API_KEY from env
});

const response = await architect.generate(
  "We've spent three months on the GraphQL gateway. " +
  "Should we keep going or pivot to REST?",
);

console.log(response.text);
```

The model reads each tool's description and routes to `harness_anti_deception` on the sunk-cost framing, `harness_reasoning` on a clean analytical question, etc.

### Pick a subset of harnesses

```ts
import { createReasoningTool, createAntiDeceptionTool } from "ejentum-mastra";

const tools = {
  harnessReasoning: createReasoningTool(),
  harnessAntiDeception: createAntiDeceptionTool(),
  // ...your other non-Ejentum tools
};
```

### Explicit API key

```ts
const tools = createEjentumTools({ apiKey: "zpka_..." });
```

## The four tools

| Tool key | Tool id (LLM-visible) | Best for | Library size |
|---|---|---|---|
| `harnessReasoning` | `harness_reasoning` | Analytical, diagnostic, planning, multi-step tasks | 311 operations |
| `harnessCode` | `harness_code` | Code generation, refactoring, review, debugging | 128 operations |
| `harnessAntiDeception` | `harness_anti_deception` | Prompts that pressure the agent to validate, certify, or soften an honest assessment | 139 operations |
| `harnessMemory` | `harness_memory` | Sharpening an observation about cross-turn drift. Filter-oriented, not write-oriented. Format `query` as `"I noticed X. This might mean Y. Sharpen: Z."` | 101 operations |

Each tool returns `{ scaffold: string }`. The bracketed labels in the returned scaffold (`[NEGATIVE GATE]`, `[PROCEDURE]`, `[REASONING TOPOLOGY]`, etc.) are instructions to the agent, not content to display.

## What an injection looks like

A real `reasoning` mode response on the query `investigate why our nightly ETL job has started failing intermittently over the past two weeks; nothing in the code or schema has changed`:

```
[NEGATIVE GATE]
The server's response time was accepted as average, despite a suspicious
rhythm break in its timing pattern.

[PROCEDURE]
Step 1: Establish baseline timing profiles by extracting historical
durations and intervals for each event type. Step 2: Compare each observed
timing against its baseline and compute deviation magnitude. Step 3:
Classify anomalies as too fast, too slow, too early, or too late, and rank
by severity. ... Step 5: If deviation exceeds two standard deviations,
probe root cause by tracing upstream dependencies. ...

[REASONING TOPOLOGY]
S1:durations -> FIXED_POINT[baselines] -> N{dismiss_timing_deviations_
without_investigation} -> for_each: S2:compare -> S3:deviation ->
G1{>2sigma?} --yes-> S4:classify -> S5:probe_cause -> FLAG -> continue --no->
S6:validate -> continue -> all_checked -> OUT:anomaly_report

[TARGET PATTERN]
Establish timing baselines by extracting historical response intervals.
Compare current server response time to this baseline. ...

[FALSIFICATION TEST]
If no event timing is flagged as suspiciously fast or slow relative to
baseline, temporal anomaly detection was not active.

Amplify: timing baseline comparison; anomaly classification; security
context elevation
Suppress: average timing acceptance; outlier normalization
```

The model reads both the natural-language `[PROCEDURE]` and the graph-logic `[REASONING TOPOLOGY]` before generating its user-facing answer.

## API reference

```ts
import { createEjentumTools, type EjentumConfig } from "ejentum-mastra";

createEjentumTools(config?: EjentumConfig): EjentumTools
```

| Config field | Default | Description |
|---|---|---|
| `apiKey` | `process.env.EJENTUM_API_KEY` | Ejentum Logic API key. |
| `apiUrl` | `https://ejentum-main-ab125c3.zuplo.app/logicv1/` | Override only if you self-host the gateway. |
| `timeoutMs` | `10000` | Per-call HTTP timeout in milliseconds. |

Per-tool factories: `createReasoningTool`, `createCodeTool`, `createAntiDeceptionTool`, `createMemoryTool`. Each accepts the same `EjentumConfig`.

## ejentum-mcp alternative

Mastra ships an MCP client (`@mastra/mcp`). If you'd rather wire the same four tools via the Model Context Protocol:

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


## Measured effects

The Ejentum harness is benchmarked publicly under CC BY 4.0 at [github.com/ejentum/benchmarks](https://github.com/ejentum/benchmarks):

- **ELEPHANT** sycophancy: 5.8% composite on GPT-4o (40 real Reddit scenarios)
- **LiveCodeBench Hard**: 85.7% to 100% on Claude Opus (28 competitive programming tasks)
- **Memory retention**: 50% fewer stale facts served (20-turn implicit state changes)
- Plus per-harness numbers across BBH/CausalBench/MuSR, ARC-AGI-3, SciCode, and perception tasks

Methodology, scenarios, run scripts, and raw outputs are all in-repo.
