import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  ThemeProvider,
  resolveTheme,
} from "@/features/settings/theme-provider";

function createMatchMedia(initial: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  let current = initial;
  return {
    get matches() {
      return current;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn(
      (_name: string, callback: (event: MediaQueryListEvent) => void) => {
        listener = callback;
      },
    ),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    emit(matches: boolean) {
      current = matches;
      act(() => listener?.({ matches } as MediaQueryListEvent));
    },
  };
}

describe("theme", () => {
  it("resolves explicit and system themes", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
  });

  it("tracks system theme changes and removes the listener", () => {
    const media = createMatchMedia(false);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => media),
    );

    const { unmount } = render(
      <ThemeProvider initialTheme="system">content</ThemeProvider>,
    );

    expect(document.documentElement.dataset.theme).toBe("light");
    media.emit(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
