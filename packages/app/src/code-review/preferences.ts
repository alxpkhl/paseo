import type {
  AgentModelDefinition,
  AgentProvider,
  ProviderSnapshotEntry,
} from "@getpaseo/protocol/agent-types";
import type { FormPreferences } from "@/create-agent-preferences/preferences";
import { filterSelectableModels, findModelByReference } from "@/provider-selection/model-catalog";

export const DEFAULT_CODE_REVIEW_PROMPT = `Review the current workspace changes against the base branch. Focus on correctness, regressions, security, missing tests, and unnecessary complexity. Do not edit any files. Return actionable findings with file and line references, ordered by severity. If there are no findings, say so clearly.`;

export interface CodeReviewSelection {
  provider: AgentProvider;
  model: string | null;
  thinkingOptionId: string | null;
}

function trimNonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function isReviewProviderCandidate(entry: ProviderSnapshotEntry): boolean {
  return entry.enabled && (entry.status === "ready" || (entry.models?.length ?? 0) > 0);
}

function resolveProviderEntry(input: {
  entries: ProviderSnapshotEntry[] | undefined;
  preferences: FormPreferences;
}): ProviderSnapshotEntry | null {
  const candidates = (input.entries ?? []).filter(isReviewProviderCandidate);
  const requestedProvider = trimNonEmpty(input.preferences.codeReview?.provider);
  const normalProvider = trimNonEmpty(input.preferences.provider);
  return (
    candidates.find((entry) => entry.provider === requestedProvider) ??
    candidates.find((entry) => entry.provider === normalProvider) ??
    candidates[0] ??
    null
  );
}

function resolvePreferredModel(input: {
  entry: ProviderSnapshotEntry;
  preferences: FormPreferences;
}): AgentModelDefinition | null {
  const models = filterSelectableModels(input.entry.models ?? null) ?? [];
  if (models.length === 0) {
    return null;
  }

  const reviewPreferences = input.preferences.codeReview;
  const requestedReviewModel =
    reviewPreferences?.provider === input.entry.provider
      ? trimNonEmpty(reviewPreferences.model)
      : null;
  const requestedNormalModel = trimNonEmpty(
    input.preferences.providerPreferences?.[input.entry.provider]?.model,
  );

  return (
    (requestedReviewModel ? findModelByReference(models, requestedReviewModel) : null) ??
    (requestedNormalModel ? findModelByReference(models, requestedNormalModel) : null) ??
    models.find((model) => model.isDefault) ??
    models[0] ??
    null
  );
}

export function resolveCodeReviewThinkingOptionId(input: {
  model: AgentModelDefinition | null;
  requestedThinkingOptionId?: string | null;
  fallbackThinkingOptionId?: string | null;
}): string | null {
  const options = input.model?.thinkingOptions ?? [];
  if (options.length === 0) {
    return null;
  }

  const requested = trimNonEmpty(input.requestedThinkingOptionId);
  if (requested && options.some((option) => option.id === requested)) {
    return requested;
  }

  const fallback = trimNonEmpty(input.fallbackThinkingOptionId);
  if (fallback && options.some((option) => option.id === fallback)) {
    return fallback;
  }

  return input.model?.defaultThinkingOptionId ?? options[0]?.id ?? null;
}

export function resolveCodeReviewSelection(input: {
  entries: ProviderSnapshotEntry[] | undefined;
  preferences: FormPreferences;
}): CodeReviewSelection | null {
  const entry = resolveProviderEntry(input);
  if (!entry) {
    return null;
  }

  const model = resolvePreferredModel({ entry, preferences: input.preferences });
  const reviewPreferences = input.preferences.codeReview;
  const requestedReviewThinking =
    reviewPreferences?.provider === entry.provider && reviewPreferences.model === model?.id
      ? reviewPreferences.thinkingOptionId
      : null;
  const normalThinking = model
    ? input.preferences.providerPreferences?.[entry.provider]?.thinkingByModel?.[model.id]
    : null;

  return {
    provider: entry.provider,
    model: model?.id ?? null,
    thinkingOptionId: resolveCodeReviewThinkingOptionId({
      model,
      requestedThinkingOptionId: requestedReviewThinking,
      fallbackThinkingOptionId: normalThinking,
    }),
  };
}

export function getCodeReviewPrompt(preferences: FormPreferences): string {
  const configuredPrompt = preferences.codeReview?.prompt;
  return configuredPrompt?.trim() ? configuredPrompt : DEFAULT_CODE_REVIEW_PROMPT;
}

export function findCodeReviewModel(input: {
  entries: ProviderSnapshotEntry[] | undefined;
  provider: AgentProvider;
  modelId: string | null;
}): AgentModelDefinition | null {
  const entry = input.entries?.find((candidate) => candidate.provider === input.provider);
  const models = filterSelectableModels(entry?.models ?? null) ?? [];
  if (models.length === 0) {
    return null;
  }
  const requestedModel = trimNonEmpty(input.modelId);
  return (
    (requestedModel ? findModelByReference(models, requestedModel) : null) ??
    models.find((model) => model.isDefault) ??
    models[0] ??
    null
  );
}
