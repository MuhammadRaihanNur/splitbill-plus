import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Topbar } from "@/components/layout/topbar";
import { resetDatabase } from "@/test/reset-database";
import { settingsRepository } from "@/features/storage/repositories";
describe("Topbar", () => {
  beforeEach(resetDatabase);
  it("shows profile changes from persistent settings", async () => {
    await settingsRepository.update({ profileName: "Dina" });
    render(<Topbar />);
    expect(await screen.findByText("Dina")).toBeInTheDocument();
    await settingsRepository.update({ profileName: "Dini" });
    expect(await screen.findByText("Dini")).toBeInTheDocument();
  });
});
