import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";
import { ThemeProvider } from "@/features/settings/theme-provider";
import { resetDatabase } from "@/test/reset-database";
describe("SettingsWorkspace", () => {
  beforeEach(resetDatabase);
  it("asks for confirmation before replacing data from a backup", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ThemeProvider>
        <ToastProvider>
          <SettingsWorkspace />
        </ToastProvider>
      </ThemeProvider>,
    );
    await screen.findByRole("heading", { name: "Pengaturan" });
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(
      input as HTMLInputElement,
      new File(["{}"], "backup.json", { type: "application/json" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Pulihkan backup?" }),
    ).toBeInTheDocument();
  });
});
