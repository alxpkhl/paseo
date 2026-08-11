import type { WorkspaceTabTarget } from "@/workspace-tabs/model";
import { buildDraftStoreKey } from "@/stores/draft-keys";
import type { DraftInput } from "@/stores/draft-store";
import type { CodeReviewSelection } from "./preferences";

export interface CodeReviewWorkspaceDraft {
  draftKey: string;
  target: Extract<WorkspaceTabTarget, { kind: "draft" }>;
}

export function buildCodeReviewWorkspaceDraft(input: {
  serverId: string;
  cwd: string;
  draftId: string;
  selection: CodeReviewSelection;
}): CodeReviewWorkspaceDraft {
  return {
    draftKey: buildDraftStoreKey({
      serverId: input.serverId,
      agentId: input.draftId,
      draftId: input.draftId,
    }),
    target: {
      kind: "draft",
      draftId: input.draftId,
      setup: {
        provider: input.selection.provider,
        cwd: input.cwd,
        modeId: null,
        model: input.selection.model,
        thinkingOptionId: input.selection.thinkingOptionId,
        featureValues: {},
      },
    },
  };
}

export function openCodeReviewWorkspaceDraft(input: {
  serverId: string;
  cwd: string | null;
  persistenceKey: string | null;
  prompt: string;
  selection: CodeReviewSelection | null;
  draftId: string;
  saveDraftInput: (input: { draftKey: string; draft: DraftInput }) => void;
  openTabFocused: (workspaceKey: string, target: WorkspaceTabTarget) => string | null;
  onUnavailable: () => void;
}): void {
  if (!input.persistenceKey || !input.cwd || !input.selection) {
    input.onUnavailable();
    return;
  }

  const draft = buildCodeReviewWorkspaceDraft({
    serverId: input.serverId,
    cwd: input.cwd,
    draftId: input.draftId,
    selection: input.selection,
  });
  input.saveDraftInput({
    draftKey: draft.draftKey,
    draft: {
      text: input.prompt,
      attachments: [],
    },
  });
  input.openTabFocused(input.persistenceKey, draft.target);
}
