import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";
import type { AgentProvider } from "@getpaseo/protocol/agent-types";
import { CombinedModelSelector } from "@/components/combined-model-selector";
import { ModelProviderGlyph } from "@/components/model-browser";
import { SettingsTextArea } from "@/components/settings-textarea";
import { Button } from "@/components/ui/button";
import { SelectField, SelectFieldTrigger } from "@/components/ui/select-field";
import { DEFAULT_CODE_REVIEW_PROMPT } from "@/code-review/preferences";
import { useCodeReviewPreferences } from "@/code-review/use-code-review-preferences";
import { SettingsSection } from "@/screens/settings/settings-section";
import { settingsStyles } from "@/styles/settings";
import { toErrorMessage } from "@/utils/error-messages";

interface CodeReviewSectionProps {
  serverId: string | null;
}

export function CodeReviewSection({ serverId }: CodeReviewSectionProps) {
  const { t } = useTranslation();
  const reviewPreferences = useCodeReviewPreferences({ serverId });
  const [promptDraft, setPromptDraft] = useState(reviewPreferences.prompt);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  useEffect(() => {
    setPromptDraft(reviewPreferences.prompt);
  }, [reviewPreferences.prompt]);

  const handleSelectModel = useCallback(
    (provider: AgentProvider, modelId: string) => {
      setIsSavingSelection(true);
      setSelectionError(null);
      void reviewPreferences
        .selectModel(provider, modelId)
        .catch((error) => setSelectionError(toErrorMessage(error)))
        .finally(() => setIsSavingSelection(false));
    },
    [reviewPreferences],
  );

  const handleSelectThinking = useCallback(
    (thinkingOptionId: string) => {
      setIsSavingSelection(true);
      setSelectionError(null);
      void reviewPreferences
        .selectThinking(thinkingOptionId)
        .catch((error) => setSelectionError(toErrorMessage(error)))
        .finally(() => setIsSavingSelection(false));
    },
    [reviewPreferences],
  );

  const handleRetryProvider = useCallback(
    (provider: AgentProvider) => {
      setSelectionError(null);
      void reviewPreferences
        .retryProvider(provider)
        .catch((error) => setSelectionError(toErrorMessage(error)));
    },
    [reviewPreferences],
  );

  const handleSavePrompt = useCallback(() => {
    if (!promptDraft.trim()) {
      setPromptError(t("settings.codeReview.prompt.required"));
      return;
    }
    setIsSavingPrompt(true);
    setPromptError(null);
    void reviewPreferences
      .savePrompt(promptDraft)
      .catch((error) => setPromptError(toErrorMessage(error)))
      .finally(() => setIsSavingPrompt(false));
  }, [promptDraft, reviewPreferences, t]);

  const handleResetPrompt = useCallback(() => {
    setPromptDraft(DEFAULT_CODE_REVIEW_PROMPT);
    setPromptError(null);
  }, []);

  const modelTriggerLeading = useMemo(
    () =>
      reviewPreferences.selection ? (
        <ModelProviderGlyph provider={reviewPreferences.selection.provider} size={16} />
      ) : null,
    [reviewPreferences.selection],
  );
  const renderModelTrigger = useCallback(
    ({
      selectedModelLabel,
      disabled,
      isOpen,
      hovered,
      pressed,
    }: {
      selectedModelLabel: string;
      onPress: () => void;
      disabled: boolean;
      isOpen: boolean;
      hovered: boolean;
      pressed: boolean;
    }): ReactNode => (
      <SelectFieldTrigger
        label={selectedModelLabel}
        isPlaceholder={!reviewPreferences.selection}
        placeholder={t("settings.codeReview.model.placeholder")}
        leading={modelTriggerLeading}
        disabled={disabled}
        loading={reviewPreferences.isLoading}
        active={hovered || pressed || isOpen}
        size="sm"
        testID="code-review-model-trigger"
      />
    ),
    [modelTriggerLeading, reviewPreferences.isLoading, reviewPreferences.selection, t],
  );

  const selectedThinkingOption = useMemo(
    () =>
      reviewPreferences.thinkingOptions.find(
        (option) => option.value === reviewPreferences.selection?.thinkingOptionId,
      ) ?? null,
    [reviewPreferences.selection?.thinkingOptionId, reviewPreferences.thinkingOptions],
  );
  const selectedThinkingDisplay = useMemo(
    () => (selectedThinkingOption ? { label: selectedThinkingOption.label } : null),
    [selectedThinkingOption],
  );
  const hasPromptChanges = promptDraft !== reviewPreferences.prompt;
  const modelDisabled = !serverId || isSavingSelection;

  return (
    <>
      <SettingsSection title={t("settings.codeReview.reviewer.title")}>
        <View style={settingsStyles.card} testID="code-review-preferences-card">
          <View style={settingsStyles.row}>
            <View style={settingsStyles.rowContent}>
              <Text style={settingsStyles.rowTitle}>{t("settings.codeReview.model.label")}</Text>
              <Text style={settingsStyles.rowHint}>
                {t("settings.codeReview.model.description")}
              </Text>
            </View>
            <View style={styles.selector}>
              <CombinedModelSelector
                providers={reviewPreferences.modelSelectorProviders}
                selectedProvider={reviewPreferences.selection?.provider ?? ""}
                selectedModel={reviewPreferences.selection?.model ?? ""}
                onSelect={handleSelectModel}
                isLoading={reviewPreferences.isLoading}
                renderTrigger={renderModelTrigger}
                triggerFill
                serverId={serverId}
                disabled={modelDisabled}
                onOpen={reviewPreferences.refetchIfStale}
                onRetryProvider={handleRetryProvider}
                isRetryingProvider={reviewPreferences.isRefreshing}
              />
            </View>
          </View>
          {reviewPreferences.thinkingOptions.length > 0 ? (
            <View style={[settingsStyles.row, settingsStyles.rowBorder]}>
              <View style={settingsStyles.rowContent}>
                <Text style={settingsStyles.rowTitle}>
                  {t("settings.codeReview.thinking.label")}
                </Text>
                <Text style={settingsStyles.rowHint}>
                  {t("settings.codeReview.thinking.description")}
                </Text>
              </View>
              <View style={styles.selector}>
                <SelectField
                  label={t("settings.codeReview.thinking.label")}
                  value={reviewPreferences.selection?.thinkingOptionId ?? null}
                  selectedDisplay={selectedThinkingDisplay}
                  options={reviewPreferences.thinkingOptions}
                  onChange={handleSelectThinking}
                  placeholder={t("settings.codeReview.thinking.placeholder")}
                  emptyText={t("settings.codeReview.thinking.empty")}
                  disabled={modelDisabled}
                  searchable={reviewPreferences.thinkingOptions.length > 6}
                  size="sm"
                  field={false}
                  triggerTestID="code-review-thinking-trigger"
                />
              </View>
            </View>
          ) : null}
        </View>
        {selectionError || reviewPreferences.error ? (
          <Text style={styles.errorText}>{selectionError ?? reviewPreferences.error}</Text>
        ) : null}
      </SettingsSection>

      <SettingsSection title={t("settings.codeReview.prompt.title")}>
        <View style={settingsStyles.card} testID="code-review-prompt-card">
          <SettingsTextArea
            testID="code-review-prompt-input"
            accessibilityLabel={t("settings.codeReview.prompt.accessibilityLabel")}
            value={promptDraft}
            onChangeText={setPromptDraft}
            placeholder={DEFAULT_CODE_REVIEW_PROMPT}
          />
          <View style={[settingsStyles.row, settingsStyles.rowBorder, styles.promptActions]}>
            {promptError ? <Text style={styles.errorText}>{promptError}</Text> : <View />}
            <View style={styles.actionButtons}>
              <Button
                variant="ghost"
                size="sm"
                onPress={handleResetPrompt}
                disabled={isSavingPrompt || promptDraft === DEFAULT_CODE_REVIEW_PROMPT}
                testID="code-review-prompt-reset"
              >
                {t("settings.codeReview.prompt.reset")}
              </Button>
              <Button
                variant="default"
                size="sm"
                onPress={handleSavePrompt}
                disabled={isSavingPrompt || !hasPromptChanges || !promptDraft.trim()}
                loading={isSavingPrompt}
                testID="code-review-prompt-save"
              >
                {isSavingPrompt
                  ? t("settings.codeReview.prompt.saving")
                  : t("settings.codeReview.prompt.save")}
              </Button>
            </View>
          </View>
        </View>
      </SettingsSection>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  selector: {
    width: {
      xs: 176,
      md: 260,
    },
    maxWidth: "55%",
  },
  promptActions: {
    justifyContent: "space-between",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  errorText: {
    color: theme.colors.palette.red[300],
    fontSize: theme.fontSize.xs,
  },
}));
