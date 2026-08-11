import { describe, expect, it } from "vitest";
import { buildCodeReviewWorkspaceDraft, openCodeReviewWorkspaceDraft } from "./workspace-draft";

describe("code review workspace draft", () => {
  it("opens a same-workspace draft with the reviewer selection", () => {
    expect(
      buildCodeReviewWorkspaceDraft({
        serverId: "local",
        cwd: "/repo/worktree",
        draftId: "draft-review",
        selection: {
          provider: "codex",
          model: "gpt-5.6-codex",
          thinkingOptionId: "high",
        },
      }),
    ).toEqual({
      draftKey: "draft:local:draft-review",
      target: {
        kind: "draft",
        draftId: "draft-review",
        setup: {
          provider: "codex",
          cwd: "/repo/worktree",
          modeId: null,
          model: "gpt-5.6-codex",
          thinkingOptionId: "high",
          featureValues: {},
        },
      },
    });
  });

  it("prefills and focuses the review draft", () => {
    const savedDrafts: unknown[] = [];
    const openedTabs: unknown[] = [];
    let unavailable = false;

    openCodeReviewWorkspaceDraft({
      serverId: "local",
      cwd: "/repo/worktree",
      persistenceKey: "workspace:local:worktree",
      prompt: "Review this change",
      selection: {
        provider: "codex",
        model: "gpt-5.6-codex",
        thinkingOptionId: "high",
      },
      draftId: "draft-review",
      saveDraftInput: (input) => savedDrafts.push(input),
      openTabFocused: (workspaceKey, target) => {
        openedTabs.push({ workspaceKey, target });
        return "tab-review";
      },
      onUnavailable: () => {
        unavailable = true;
      },
    });

    expect(savedDrafts).toEqual([
      {
        draftKey: "draft:local:draft-review",
        draft: { text: "Review this change", attachments: [] },
      },
    ]);
    expect(openedTabs).toEqual([
      {
        workspaceKey: "workspace:local:worktree",
        target: {
          kind: "draft",
          draftId: "draft-review",
          setup: {
            provider: "codex",
            cwd: "/repo/worktree",
            modeId: null,
            model: "gpt-5.6-codex",
            thinkingOptionId: "high",
            featureValues: {},
          },
        },
      },
    ]);
    expect(unavailable).toBe(false);
  });

  it("reports when review setup is unavailable without creating a draft", () => {
    let didSave = false;
    let didOpen = false;
    let unavailable = false;

    openCodeReviewWorkspaceDraft({
      serverId: "local",
      cwd: "/repo/worktree",
      persistenceKey: "workspace:local:worktree",
      prompt: "Review this change",
      selection: null,
      draftId: "draft-review",
      saveDraftInput: () => {
        didSave = true;
      },
      openTabFocused: () => {
        didOpen = true;
        return null;
      },
      onUnavailable: () => {
        unavailable = true;
      },
    });

    expect(didSave).toBe(false);
    expect(didOpen).toBe(false);
    expect(unavailable).toBe(true);
  });
});
