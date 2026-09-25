import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".worktrees/**",
    "node_modules/**",
    "coverage/**",
    "public/ocr/runtime/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
