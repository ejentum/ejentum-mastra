/**
 * Mastra createTool() factories for the Ejentum Reasoning Harness.
 *
 * Eight tools: four dynamic (`reasoning`, `code`, `anti-deception`,
 * `memory`) and four adaptive (`adaptive-reasoning`, `adaptive-code`,
 * `adaptive-anti-deception`, `adaptive-memory`) that pre-fit the
 * cognitive operation to the caller's task via an adapter LLM.
 * Adaptive tools require the Go or Super tier.
 *
 * Tool name (the `id` field, visible to the LLM) equals the API mode
 * string. The wrapper object keys are camelCase developer-friendly
 * identifiers; the LLM-facing name lives in `id`.
 *
 * The bracketed labels in the returned injection (`[NEGATIVE GATE]`,
 * `[PROCEDURE]`, `[REASONING TOPOLOGY]`, etc.) are instructions to the
 * agent, not content to display.
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { callLogicApi, type EjentumConfig } from "./api.js";

const inputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "A 1-2 sentence description of the task the agent is about to " +
        "work on. Be specific about the failure mode to avoid. For " +
        "memory and adaptive-memory, format as: 'I noticed [X]. This " +
        "might mean [Y]. Sharpen: [Z].'",
    ),
});

const outputSchema = z.object({
  injection: z
    .string()
    .describe(
      "Structured cognitive injection from the Ejentum Logic API. " +
        "Contains bracketed labels ([NEGATIVE GATE], [PROCEDURE], " +
        "[REASONING TOPOLOGY], [FALSIFICATION TEST]) the agent reads " +
        "internally before generating its user-facing answer. Do not " +
        "echo the bracket labels to the user.",
    ),
});

// ---------------------------------------------------------------------------
// Dynamic tools (single retrieval, all tiers including the 30-day trial)
// ---------------------------------------------------------------------------

export function createReasoningTool(config: EjentumConfig = {}) {
  return createTool({
    id: "reasoning",
    description:
      "Retrieve a reasoning injection before any analytical, " +
      "diagnostic, planning, or multi-step task. Returns a structured " +
      "injection with a named failure pattern, an executable procedure, " +
      "a reasoning topology (graph DAG), and a falsification test from " +
      "a library of 311 reasoning operations.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("reasoning", query, config),
    }),
  });
}

export function createCodeTool(config: EjentumConfig = {}) {
  return createTool({
    id: "code",
    description:
      "Retrieve a code injection before any code generation, " +
      "refactoring, review, or debugging task. Returns a structured " +
      "injection with a named code-failure pattern, an engineering " +
      "procedure, a reasoning topology (graph DAG), and a verification " +
      "step from a library of 128 code operations.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("code", query, config),
    }),
  });
}

export function createAntiDeceptionTool(config: EjentumConfig = {}) {
  return createTool({
    id: "anti-deception",
    description:
      "Retrieve an anti-deception injection before responding to any " +
      "prompt that pressures the agent to validate, certify, or soften " +
      "an honest assessment. Returns a structured injection with a " +
      "named deception pattern, an integrity procedure, a detection " +
      "topology (graph DAG with omission-bias gates), and an integrity " +
      "check from a library of 139 operations.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("anti-deception", query, config),
    }),
  });
}

export function createMemoryTool(config: EjentumConfig = {}) {
  return createTool({
    id: "memory",
    description:
      "Retrieve a memory-mode injection ONLY when sharpening an " +
      "observation the agent has already formed about cross-turn " +
      "drift or pattern. Filter-oriented, not write-oriented. Format " +
      "'query' as: 'I noticed [X]. This might mean [Y]. Sharpen: [Z].' " +
      "Library of 101 perception operations.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("memory", query, config),
    }),
  });
}

// ---------------------------------------------------------------------------
// Adaptive tools (top-k retrieval + LLM adapter rewrites operation to fit
// the specific task; requires Go or Super tier)
// ---------------------------------------------------------------------------

export function createAdaptiveReasoningTool(config: EjentumConfig = {}) {
  return createTool({
    id: "adaptive-reasoning",
    description:
      "Same triggers as `reasoning`, but the returned operation is " +
      "REWRITTEN by an adapter LLM to fit the specific task. Procedure " +
      "steps and topology DAG nodes are concretized with task-specific " +
      "language. Use when the dynamic tool is too generic, or for " +
      "high-stakes analytical work where every DAG node should already " +
      "be mapped to the task before generation. Requires Go or Super " +
      "tier. Cost ~2-3s.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("adaptive-reasoning", query, config),
    }),
  });
}

export function createAdaptiveCodeTool(config: EjentumConfig = {}) {
  return createTool({
    id: "adaptive-code",
    description:
      "Same triggers as `code`, but the returned operation is REWRITTEN " +
      "by an adapter LLM to fit the specific code task: language, " +
      "framework, and failure modes are concretized in every step. Use " +
      "for security-critical reviews, refactor-heavy diffs, or any code " +
      "work where every verification step should already be mapped to " +
      "the specifics. Requires Go or Super tier. Cost ~2-3s.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("adaptive-code", query, config),
    }),
  });
}

export function createAdaptiveAntiDeceptionTool(config: EjentumConfig = {}) {
  return createTool({
    id: "adaptive-anti-deception",
    description:
      "Same triggers as `anti-deception`, but the returned operation is " +
      "REWRITTEN by an adapter LLM to fit the specific integrity " +
      "dynamic: detection topology gates are concretized to the exact " +
      "pressure, authority appeal, or framing trap at play. Use when " +
      "stakes of a soft or sycophantic answer are high. Requires Go or " +
      "Super tier. Cost ~2-3s.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("adaptive-anti-deception", query, config),
    }),
  });
}

export function createAdaptiveMemoryTool(config: EjentumConfig = {}) {
  return createTool({
    id: "adaptive-memory",
    description:
      "Same triggers as `memory`, but the returned operation is " +
      "REWRITTEN by an adapter LLM to fit the specific observation: " +
      "perception topology nodes are concretized to the specific " +
      "signal. Use when the dynamic memory tool's general scaffold is " +
      "not sharp enough for the perception being formed. Observe FIRST, " +
      "then call. Requires Go or Super tier. Cost ~2-3s.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      injection: await callLogicApi("adaptive-memory", query, config),
    }),
  });
}

export interface EjentumTools {
  reasoning: ReturnType<typeof createReasoningTool>;
  code: ReturnType<typeof createCodeTool>;
  antiDeception: ReturnType<typeof createAntiDeceptionTool>;
  memory: ReturnType<typeof createMemoryTool>;
  adaptiveReasoning: ReturnType<typeof createAdaptiveReasoningTool>;
  adaptiveCode: ReturnType<typeof createAdaptiveCodeTool>;
  adaptiveAntiDeception: ReturnType<typeof createAdaptiveAntiDeceptionTool>;
  adaptiveMemory: ReturnType<typeof createAdaptiveMemoryTool>;
}

/**
 * Create all eight Ejentum harness tools with shared config.
 *
 * ```ts
 * import { Agent } from "@mastra/core/agent";
 * import { createEjentumTools } from "ejentum-mastra";
 *
 * const agent = new Agent({
 *   id: "senior-architect",
 *   name: "Senior Architect",
 *   instructions: "Push back on sunk-cost framings.",
 *   model: "anthropic/claude-sonnet-4-6",
 *   tools: createEjentumTools(),
 * });
 * ```
 *
 * @param config Shared Ejentum config (`apiKey`, `apiUrl`,
 *   `timeoutMs`). If `apiKey` is omitted, each tool reads
 *   `EJENTUM_API_KEY` from the environment at call time.
 */
export function createEjentumTools(
  config: EjentumConfig = {},
): EjentumTools {
  return {
    reasoning: createReasoningTool(config),
    code: createCodeTool(config),
    antiDeception: createAntiDeceptionTool(config),
    memory: createMemoryTool(config),
    adaptiveReasoning: createAdaptiveReasoningTool(config),
    adaptiveCode: createAdaptiveCodeTool(config),
    adaptiveAntiDeception: createAdaptiveAntiDeceptionTool(config),
    adaptiveMemory: createAdaptiveMemoryTool(config),
  };
}
