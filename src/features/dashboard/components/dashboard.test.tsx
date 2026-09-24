import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { Dashboard } from "@/features/dashboard/components/dashboard";
import { resetDatabase } from "@/test/reset-database";
import {
  groupRepository,
  participantRepository,
  transactionRepository,
} from "@/features/storage/repositories";

describe("Dashboard", () => {
  beforeEach(resetDatabase);
  it("renders persisted group and transaction summaries", async () => {
    const person = await participantRepository.create({ name: "Andi" });
    const group = await groupRepository.create({
      name: "Anak Kantor",
      description: "",
      emoji: "💼",
      memberIds: [person.id],
    });
    const now = new Date().toISOString();
    await transactionRepository.saveAggregate(
      {
        id: "tx",
        title: "Makan Siang Kantor",
        category: "food",
        groupId: group.id,
        groupName: group.name,
        participants: [person],
        subtotal: 500000,
        tax: 55000,
        serviceCharge: 0,
        tip: 0,
        grandTotal: 555000,
        splitMode: "equal",
        splits: [
          {
            participantId: person.id,
            participantName: person.name,
            amount: 555000,
          },
        ],
        status: "completed",
        createdAt: now,
        updatedAt: now,
      },
      [],
    );
    render(<Dashboard />);
    expect(
      await screen.findByRole("heading", { name: /selamat datang, raihan/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Anak Kantor")).toBeInTheDocument();
    expect(screen.getByText("Makan Siang Kantor")).toBeInTheDocument();
    expect(screen.getAllByText("Rp 555.000")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: /mulai split bill/i }),
    ).toHaveAttribute("href", "/split-bill");
  });
});
