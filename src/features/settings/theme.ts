export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function resolveTheme(theme: Theme, systemDark: boolean): ResolvedTheme {
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}
