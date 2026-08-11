import { expect, test } from "../support/fixtures";
import { composerLocator } from "../support/helpers/composer";
import { countTabsOfKind } from "../support/helpers/launcher";
import {
  clickSettingsBackToWorkspace,
  expectSettingsHeader,
  openSettingsSection,
} from "../support/helpers/settings";

const REVIEW_PROMPT =
  "Review the current changes for correctness and regressions. Return only actionable findings.";

async function readCodeReviewPreferences(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem("@paseo:create-agent-preferences");
    if (!raw) return null;
    const preferences = JSON.parse(raw) as {
      codeReview?: {
        provider?: string;
        model?: string;
        thinkingOptionId?: string;
        prompt?: string;
      };
    };
    return preferences.codeReview ?? null;
  });
}

test.describe("Workspace code review", () => {
  test("configures the reviewer and opens a prefilled same-workspace draft", async ({
    page,
    withWorkspace,
  }) => {
    const workspace = await withWorkspace({ prefix: "code-review-" });
    await workspace.navigateTo();

    await page.getByTestId("sidebar-settings").filter({ visible: true }).click();
    await openSettingsSection(page, "review");
    await expectSettingsHeader(page, "Review");

    const modelSelector = page.getByTestId("combined-model-selector").filter({ visible: true });
    await expect(modelSelector).toBeEnabled({ timeout: 30_000 });
    await modelSelector.click();
    const modelSearch = page.getByTestId("model-search-input").filter({ visible: true });
    await expect(modelSearch).toBeVisible();
    await modelSearch.fill("Five minute stream");
    await page.getByRole("dialog").getByText("Five minute stream", { exact: true }).first().click();

    const thinkingSelector = page.getByTestId("code-review-thinking-trigger");
    await expect(thinkingSelector).toContainText("Low");
    await thinkingSelector.click();
    await page.getByRole("dialog").getByText("Medium", { exact: true }).click();
    await expect(thinkingSelector).toContainText("Medium");

    await page.getByTestId("code-review-prompt-input").fill(REVIEW_PROMPT);
    await page.getByTestId("code-review-prompt-save").click();
    await expect
      .poll(() => readCodeReviewPreferences(page))
      .toEqual({
        provider: "mock",
        model: "five-minute-stream",
        thinkingOptionId: "medium",
        prompt: REVIEW_PROMPT,
      });

    await clickSettingsBackToWorkspace(page);
    const draftCountBefore = await countTabsOfKind(page, "draft");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+Shift+R`);

    await expect
      .poll(() => countTabsOfKind(page, "draft"), { timeout: 15_000 })
      .toBe(draftCountBefore + 1);
    await expect(composerLocator(page)).toHaveValue(REVIEW_PROMPT);
    await expect(
      page.getByRole("button", { name: "Select model (Five minute stream)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Select thinking option (Medium)" }),
    ).toBeVisible();
  });
});
