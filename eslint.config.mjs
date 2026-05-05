import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Seating Chart — locked, adresat în Faza 2A
    "app/seating-chart/**",
    // Auto-generated Supabase types (Faza 13.0 PR 1A) — ESLint nu poate parsa formatul
    "types/database.ts",
  ]),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
