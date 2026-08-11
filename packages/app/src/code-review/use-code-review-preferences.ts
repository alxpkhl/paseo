import { useCallback, useMemo } from "react";
import type { AgentProvider } from "@getpaseo/protocol/agent-types";
import { formatThinkingOptionLabel } from "@/agent-controls/labels";
import { mergeCodeReviewPreferences, useFormPreferences } from "@/hooks/use-form-preferences";
import { useProvidersSnapshot } from "@/hooks/use-providers-snapshot";
import {
  buildSelectableProviderSelectorProviders,
  type ProviderSelectorProvider,
} from "@/provider-selection/provider-selection";
import type { SelectFieldOption } from "@/components/ui/select-field";
import {
  findCodeReviewModel,
  getCodeReviewPrompt,
  resolveCodeReviewSelection,
  resolveCodeReviewThinkingOptionId,
  type CodeReviewSelection,
} from "./preferences";

interface UseCodeReviewPreferencesInput {
  serverId: string | null;
  cwd?: string | null;
}

interface UseCodeReviewPreferencesResult {
  selection: CodeReviewSelection | null;
  prompt: string;
  modelSelectorProviders: ProviderSelectorProvider[];
  thinkingOptions: SelectFieldOption<string>[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectModel: (provider: AgentProvider, modelId: string) => Promise<void>;
  selectThinking: (thinkingOptionId: string) => Promise<void>;
  savePrompt: (prompt: string) => Promise<void>;
  refetchIfStale: () => void;
  retryProvider: (provider: AgentProvider) => Promise<void>;
}

export function useCodeReviewPreferences({
  serverId,
  cwd = null,
}: UseCodeReviewPreferencesInput): UseCodeReviewPreferencesResult {
  const { preferences, isLoading: preferencesLoading, updatePreferences } = useFormPreferences();
  const snapshot = useProvidersSnapshot(serverId, { cwd });
  const selection = useMemo(
    () => resolveCodeReviewSelection({ entries: snapshot.entries, preferences }),
    [preferences, snapshot.entries],
  );
  const prompt = getCodeReviewPrompt(preferences);
  const modelSelectorProviders = useMemo(
    () => buildSelectableProviderSelectorProviders(snapshot.entries),
    [snapshot.entries],
  );
  const selectedModel = useMemo(
    () =>
      selection
        ? findCodeReviewModel({
            entries: snapshot.entries,
            provider: selection.provider,
            modelId: selection.model,
          })
        : null,
    [selection, snapshot.entries],
  );
  const thinkingOptions = useMemo<SelectFieldOption<string>[]>(
    () =>
      (selectedModel?.thinkingOptions ?? []).map((option) => ({
        id: option.id,
        value: option.id,
        label: formatThinkingOptionLabel(option),
      })),
    [selectedModel?.thinkingOptions],
  );

  const selectModel = useCallback(
    async (provider: AgentProvider, modelId: string) => {
      const model = findCodeReviewModel({ entries: snapshot.entries, provider, modelId });
      const thinkingOptionId = resolveCodeReviewThinkingOptionId({ model });
      await updatePreferences((current) =>
        mergeCodeReviewPreferences({
          preferences: current,
          updates: {
            provider,
            model: model?.id ?? "",
            thinkingOptionId: thinkingOptionId ?? "",
          },
        }),
      );
    },
    [snapshot.entries, updatePreferences],
  );

  const selectThinking = useCallback(
    async (thinkingOptionId: string) => {
      if (!selection) {
        return;
      }
      await updatePreferences((current) =>
        mergeCodeReviewPreferences({
          preferences: current,
          updates: {
            provider: selection.provider,
            model: selection.model ?? "",
            thinkingOptionId,
          },
        }),
      );
    },
    [selection, updatePreferences],
  );

  const savePrompt = useCallback(
    async (nextPrompt: string) => {
      await updatePreferences((current) =>
        mergeCodeReviewPreferences({
          preferences: current,
          updates: { prompt: nextPrompt },
        }),
      );
    },
    [updatePreferences],
  );

  const refetchIfStale = useCallback(() => {
    snapshot.refetchIfStale(selection?.provider);
  }, [selection?.provider, snapshot]);

  const retryProvider = useCallback(
    async (provider: AgentProvider) => {
      await snapshot.refresh([provider]);
    },
    [snapshot],
  );

  return {
    selection,
    prompt,
    modelSelectorProviders,
    thinkingOptions,
    isLoading: preferencesLoading || snapshot.isLoading || snapshot.isFetching,
    isRefreshing: snapshot.isRefreshing,
    error: snapshot.error,
    selectModel,
    selectThinking,
    savePrompt,
    refetchIfStale,
    retryProvider,
  };
}
