import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders Indonesian document language and the provided content", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Konten SplitBill+</main>
      </RootLayout>,
    );

    expect(markup).toContain('<html lang="id">');
    expect(markup).toContain("Konten SplitBill+");
  });
});
