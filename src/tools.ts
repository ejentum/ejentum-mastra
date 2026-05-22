/**
 * Mastra createTool() factories for the Ejentum Reasoning Harness.
 *
 * Each tool is built with `createTool` from `@mastra/core/tools`: an
 * `id`, a `description` the LLM reads, a Zod `inputSchema`, a Zod
 * `outputSchema`, and an async `execute` that calls the Ejentum Logic
 * API.
 *
 * The bracketed labels in the returned scaffold (`[NEGATIVE GATE]`,
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
        "the memory tool, format as: 'I noticed [X]. This might mean " +
        "[Y]. Sharpen: [Z].'",
    ),
});

const outputSchema = z.object({
  scaffold: z
    .string()
    .describe(
      "Structured cognitive scaffold from the Ejentum Logic API. " +
        "Contains bracketed labels ([NEGATIVE GATE], [PROCEDURE], " +
        "[REASONING TOPOLOGY], [FALSIFICATION TEST]) the agent reads " +
        "internally before generating its user-facing answer. Do not " +
        "echo the bracket labels to the user.",
    ),
});

/**
 * Reasoning-mode harness tool. Call BEFORE the agent performs
 * analysis, diagnosis, planning, or any multi-step task. Library
 * of 311 reasoning operations.
 */
export function createReasoningTool(config: EjentumConfig = {}) {
  return createTool({
    id: "harness_reasoning",
    description:
      "Retrieve a reasoning scaffold before any analytical, " +
      "diagnostic, planning, or multi-step task. Returns a " +
      "structured scaffold with a named failure pattern, an " +
      "executable procedure, a reasoning topology (graph DAG), " +
      "and a falsification test from a library of 311 reasoning " +
      "operations. Use 'query' to describe what the agent is " +
      "about to work on in 1-2 sentences.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      scaffold: await callLogicApi("reasoning", query, config),
    }),
  });
}

/**
 * Code-mode harness tool. Call BEFORE the agent produces or
 * reviews code. Library of 128 software-engineering operations.
 */
export function createCodeTool(config: EjentumConfig = {}) {
  return createTool({
    id: "harness_code",
    description:
      "Retrieve a code scaffold before any code generation, " +
      "refactoring, review, or debugging task. Returns a " +
      "structured scaffold with a named code-failure pattern, an " +
      "engineering procedure, a reasoning topology (graph DAG), " +
      "and a verification step from a library of 128 code " +
      "operations. Use 'query' to describe what the agent is " +
      "coding or reviewing in 1-2 sentences.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      scaffold: await callLogicApi("code", query, config),
    }),
  });
}

/**
 * Anti-deception harness tool. Call BEFORE the agent responds to
 * prompts that pressure validation, manufactured agreement,
 * authority appeals, fabricated commitments, or any setup where
 * the obvious helpful answer would compromise honesty.
 */
export function createAntiDeceptionTool(config: EjentumConfig = {}) {
  return createTool({
    id: "harness_anti_deception",
    description:
      "Retrieve an anti-deception scaffold before responding to " +
      "any prompt that pressures the agent to validate, certify, " +
      "or soften an honest assessment. Returns a structured " +
      "scaffold with a named deception pattern, an integrity " +
      "procedure, a detection topology (graph DAG with " +
      "omission-bias gates), and an integrity check. Use 'query' " +
      "to describe the integrity dynamic at play in 1-2 sentences.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      scaffold: await callLogicApi("anti-deception", query, config),
    }),
  });
}

/**
 * Memory-mode harness tool. Call ONLY when sharpening an
 * observation the agent has already formed about cross-turn
 * drift or pattern. Filter-oriented, not write-oriented.
 */
export function createMemoryTool(config: EjentumConfig = {}) {
  return createTool({
    id: "harness_memory",
    description:
      "Retrieve a memory-mode scaffold ONLY when sharpening an " +
      "observation the agent has already formed about cross-turn " +
      "drift or pattern. Filter-oriented, not write-oriented; do " +
      "not call for fact extraction. Format 'query' as: 'I " +
      "noticed [X]. This might mean [Y]. Sharpen: [Z].' Calling " +
      "with an empty mind defeats the harness.",
    inputSchema,
    outputSchema,
    execute: async ({ query }) => ({
      scaffold: await callLogicApi("memory", query, config),
    }),
  });
}

/**
 * Return value of `createEjentumTools`. Pass this directly to
 * `new Agent({ tools, ... })`.
 */
export interface EjentumTools {
  harnessReasoning: ReturnType<typeof createReasoningTool>;
  harnessCode: ReturnType<typeof createCodeTool>;
  harnessAntiDeception: ReturnType<typeof createAntiDeceptionTool>;
  harnessMemory: ReturnType<typeof createMemoryTool>;
}

/**
 * Create all four Ejentum harness tools with shared config.
 *
 * Pass the returned object as the `tools` argument of
 * `new Agent({ tools, ... })`. The LLM picks the right harness
 * per turn based on each tool's description.
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
    harnessReasoning: createReasoningTool(config),
    harnessCode: createCodeTool(config),
    harnessAntiDeception: createAntiDeceptionTool(config),
    harnessMemory: createMemoryTool(config),
  };
}
