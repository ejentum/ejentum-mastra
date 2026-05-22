import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callLogicApi,
  createAntiDeceptionTool,
  createCodeTool,
  createEjentumTools,
  createMemoryTool,
  createReasoningTool,
  VALID_MODES,
} from "../src/index.js";

const API_URL = "https://example.test/api/";

const okResponse = (body: unknown): Response => ({
  status: 200,
  headers: new Headers({ "Content-Type": "application/json" }),
  json: async () => body,
  text: async () => JSON.stringify(body),
}) as unknown as Response;

const errorResponse = (status: number, text: string): Response => ({
  status,
  headers: new Headers(),
  json: async () => {
    throw new Error("not json");
  },
  text: async () => text,
}) as unknown as Response;

const htmlResponse = (text: string): Response => ({
  status: 200,
  headers: new Headers({ "Content-Type": "text/html" }),
  json: async () => {
    throw new Error("not json");
  },
  text: async () => text,
}) as unknown as Response;

describe("createEjentumTools factory", () => {
  it("returns four tools keyed by harness* names", () => {
    const tools = createEjentumTools();
    expect(Object.keys(tools).sort()).toEqual([
      "harnessAntiDeception",
      "harnessCode",
      "harnessMemory",
      "harnessReasoning",
    ]);
  });

  it("each tool has id, description, inputSchema, outputSchema, execute", () => {
    const tools = createEjentumTools();
    for (const key of Object.keys(tools)) {
      const t = (tools as Record<string, { id: string; description: string; inputSchema: unknown; outputSchema: unknown; execute: unknown }>)[key];
      expect(typeof t.id).toBe("string");
      expect(t.id.startsWith("harness_")).toBe(true);
      expect(typeof t.description).toBe("string");
      expect(t.description.length).toBeGreaterThan(50);
      expect(t.inputSchema).toBeDefined();
      expect(t.outputSchema).toBeDefined();
      expect(typeof t.execute).toBe("function");
    }
  });

  it("tool ids match the expected harness_* names", () => {
    const tools = createEjentumTools();
    expect(tools.harnessReasoning.id).toBe("harness_reasoning");
    expect(tools.harnessCode.id).toBe("harness_code");
    expect(tools.harnessAntiDeception.id).toBe("harness_anti_deception");
    expect(tools.harnessMemory.id).toBe("harness_memory");
  });

  it("returns independent tool instances per factory call", () => {
    const a = createEjentumTools();
    const b = createEjentumTools();
    expect(a.harnessReasoning).not.toBe(b.harnessReasoning);
  });
});

describe("per-tool factories", () => {
  it("createReasoningTool description mentions reasoning", () => {
    const t = createReasoningTool();
    expect(t.description).toMatch(/reasoning/i);
  });
  it("createCodeTool description mentions code", () => {
    const t = createCodeTool();
    expect(t.description).toMatch(/code/i);
  });
  it("createAntiDeceptionTool description mentions anti-deception or integrity", () => {
    const t = createAntiDeceptionTool();
    expect(t.description.toLowerCase()).toMatch(/anti-deception|integrity|honest/);
  });
  it("createMemoryTool description warns about filter orientation", () => {
    const t = createMemoryTool();
    expect(t.description.toLowerCase()).toMatch(/filter|sharpen|noticed/);
  });
});

describe("VALID_MODES constant", () => {
  it("contains the four canonical modes", () => {
    expect([...VALID_MODES].sort()).toEqual([
      "anti-deception",
      "code",
      "memory",
      "reasoning",
    ]);
  });
});

describe("callLogicApi failure surface", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.EJENTUM_API_KEY;
  });

  it("empty query returns validation error without calling fetch", async () => {
    process.env.EJENTUM_API_KEY = "test-key";
    const result = await callLogicApi("reasoning", "", { apiUrl: API_URL });
    expect(result.toLowerCase()).toContain("query");
    expect(result.toLowerCase()).toContain("required");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("whitespace-only query does not leak a paid request", async () => {
    process.env.EJENTUM_API_KEY = "test-key";
    const result = await callLogicApi("reasoning", "   \t\n  ", {
      apiUrl: API_URL,
    });
    expect(result.toLowerCase()).toContain("query");
    expect(result.toLowerCase()).toContain("required");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("non-string query does not leak a paid request", async () => {
    process.env.EJENTUM_API_KEY = "test-key";
    const result = await callLogicApi(
      "reasoning",
      null as unknown as string,
      { apiUrl: API_URL },
    );
    expect(result.toLowerCase()).toContain("query");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("invalid mode returns validation error", async () => {
    const result = await callLogicApi(
      "not-a-mode" as never,
      "anything",
      { apiKey: "test-key", apiUrl: API_URL },
    );
    expect(result.toLowerCase()).toContain("mode");
    expect(result.toLowerCase()).toContain("reasoning");
  });

  it("missing api key returns actionable error pointing to pricing", async () => {
    const result = await callLogicApi("reasoning", "diagnose 503s", {
      apiUrl: API_URL,
    });
    expect(result).toContain("EJENTUM_API_KEY");
    expect(result).toContain("ejentum.com/pricing");
  });

  it("401 returns actionable error", async () => {
    fetchSpy.mockResolvedValue(errorResponse(401, "Unauthorized"));
    const result = await callLogicApi("anti-deception", "anything", {
      apiKey: "bad-key",
      apiUrl: API_URL,
    });
    expect(result).toContain("401");
    expect(result).toContain("EJENTUM_API_KEY");
  });

  it("non-200 returns status code and truncated body", async () => {
    fetchSpy.mockResolvedValue(errorResponse(500, "boom"));
    const result = await callLogicApi("code", "anything", {
      apiKey: "test-key",
      apiUrl: API_URL,
    });
    expect(result).toContain("500");
    expect(result).toContain("boom");
  });

  it("invalid JSON response is handled", async () => {
    fetchSpy.mockResolvedValue(htmlResponse("<html>not json</html>"));
    const result = await callLogicApi("reasoning", "anything", {
      apiKey: "test-key",
      apiUrl: API_URL,
    });
    expect(result.toLowerCase()).toContain("not valid json");
  });

  it("unexpected response shape is handled", async () => {
    fetchSpy.mockResolvedValue(okResponse({ wrong: "shape" }));
    const result = await callLogicApi("code", "anything", {
      apiKey: "test-key",
      apiUrl: API_URL,
    });
    expect(result.toLowerCase()).toContain("unexpected response shape");
  });

  it("non-string scaffold value is handled", async () => {
    fetchSpy.mockResolvedValue(
      okResponse([{ reasoning: ["not", "a", "string"] }]),
    );
    const result = await callLogicApi("reasoning", "anything", {
      apiKey: "test-key",
      apiUrl: API_URL,
    });
    expect(result.toLowerCase()).toContain("unexpected response shape");
  });

  it("network error is caught and returned as string", async () => {
    fetchSpy.mockRejectedValue(new Error("simulated network failure"));
    const result = await callLogicApi("memory", "I noticed drift. This might mean Y. Sharpen: Z.", {
      apiKey: "test-key",
      apiUrl: API_URL,
    });
    expect(result.toLowerCase()).toContain("network error");
    expect(result).toContain("simulated network failure");
  });
});

describe("callLogicApi success path", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  for (const mode of ["reasoning", "code", "anti-deception", "memory"] as const) {
    it(`round-trips ${mode} mode`, async () => {
      fetchSpy.mockResolvedValue(
        okResponse([{ [mode]: `[NEGATIVE GATE] sample ${mode} scaffold` }]),
      );
      const query =
        mode === "memory"
          ? "I noticed drift. This might mean Y. Sharpen: Z."
          : "sample task";
      const result = await callLogicApi(mode, query, {
        apiKey: "test-key",
        apiUrl: API_URL,
      });
      expect(result).toContain(`sample ${mode} scaffold`);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0] ?? [];
      expect(calledUrl).toBe(API_URL);
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-key");
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body).toEqual({ query, mode });
    });
  }

  it("explicit apiKey overrides env var", async () => {
    process.env.EJENTUM_API_KEY = "env-key";
    fetchSpy.mockResolvedValue(okResponse([{ reasoning: "scaffold" }]));
    await callLogicApi("reasoning", "anything", {
      apiKey: "explicit-key",
      apiUrl: API_URL,
    });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer explicit-key");
    delete process.env.EJENTUM_API_KEY;
  });

  it("env var is read when apiKey is omitted", async () => {
    process.env.EJENTUM_API_KEY = "env-key";
    fetchSpy.mockResolvedValue(okResponse([{ reasoning: "scaffold" }]));
    await callLogicApi("reasoning", "anything", { apiUrl: API_URL });
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer env-key");
    delete process.env.EJENTUM_API_KEY;
  });
});
