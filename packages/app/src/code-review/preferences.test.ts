import { describe, expect, it } from "vitest";
import type { AgentModelDefinition, ProviderSnapshotEntry } from "@getpaseo/protocol/agent-types";
import {
  DEFAULT_CODE_REVIEW_PROMPT,
  getCodeReviewPrompt,
  resolveCodeReviewSelection,
} from "./preferences";

const codexModels: AgentModelDefinition[] = [
  {
    provider: "codex",
    id: "gpt-5.6-codex",
    label: "GPT-5.6 Codex",
    isDefault: true,
    defaultThinkingOptionId: "high",
    thinkingOptions: [
      { id: "medium", label: "Medium" },
      { id: "high", label: "High" },
    ],
  },
];

const claudeModels: AgentModelDefinition[] = [
  {
    provider: "claude",
    id: "opus",
    label: "Opus",
    isDefault: true,
    thinkingOptions: [{ id: "extended", label: "Extended" }],
  },
];

function entry(provider: string, models: AgentModelDefinition[]): ProviderSnapshotEntry {
  return {
    provider,
    label: provider,
    status: "ready",
    enabled: true,
    models,
  };
}

const entries = [entry("claude", claudeModels), entry("codex", codexModels)];

describe("code review preferences", () => {
  it("keeps the reviewer model independent from the normal agent default", () => {
    expect(
      resolveCodeReviewSelection({
        entries,
        preferences: {
          provider: "claude",
          providerPreferences: { claude: { model: "opus" } },
          codeReview: {
            provider: "codex",
            model: "gpt-5.6-codex",
            thinkingOptionId: "medium",
          },
        },
      }),
    ).toEqual({
      provider: "codex",
      model: "gpt-5.6-codex",
      thinkingOptionId: "medium",
    });
  });

  it("falls back to the normal selection until review defaults are configured", () => {
    expect(
      resolveCodeReviewSelection({
        entries,
        preferences: {
          provider: "claude",
          providerPreferences: {
            claude: { model: "opus", thinkingByModel: { opus: "extended" } },
          },
        },
      }),
    ).toEqual({ provider: "claude", model: "opus", thinkingOptionId: "extended" });
  });

  it("recovers from a removed review model with the provider default", () => {
    expect(
      resolveCodeReviewSelection({
        entries,
        preferences: {
          codeReview: {
            provider: "codex",
            model: "removed-model",
            thinkingOptionId: "removed-thinking",
          },
        },
      }),
    ).toEqual({ provider: "codex", model: "gpt-5.6-codex", thinkingOptionId: "high" });
  });

  it("uses a useful default prompt and preserves a configured prompt", () => {
    expect(getCodeReviewPrompt({})).toBe(DEFAULT_CODE_REVIEW_PROMPT);
    expect(getCodeReviewPrompt({ codeReview: { prompt: "  Check API compatibility.  " } })).toBe(
      "  Check API compatibility.  ",
    );
  });
});
