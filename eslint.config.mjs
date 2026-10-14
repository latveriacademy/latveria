import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/drizzle/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/src/**/*.{js,jsx}"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
      "no-alert": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='dialog']",
          message: "Gunakan AppDialog/ConfirmDialog berbasis primitive Radix bersama.",
        },
        {
          selector: "JSXAttribute[name.name='role'][value.value='dialog']",
          message: "Jangan membuat modal manual; gunakan AppDialog atau primitive Dialog bersama.",
        },
      ],
    },
  },
  {
    files: ["apps/web/src/**/*.{js,jsx,ts,tsx}", "packages/shared/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["**/api/src/**", "@latveria/api", "@latveria/api/**"] },
      ],
    },
  },
  {
    files: ["apps/web/src/components/ui/*.{ts,tsx}"],
    ignores: ["**/dashboard.tsx", "**/dashboard-shell.tsx", "**/*.test.tsx"],
    rules: { "max-lines": ["error", { max: 150, skipBlankLines: true, skipComments: true }] },
  },
  // Legacy budgets prohibit growth while these modules are split by concern.
  ...Object.entries({
    "apps/api/scripts/seed-db.ts": 620,
    "apps/api/scripts/verify-api.ts": 699,
    "apps/api/src/services/tryout/tryout.service.ts": 537,
    "apps/api/src/handlers/users.handler.ts": 780,
    "apps/web/src/app/admin/users/admin-users.tsx": 1200,
    "apps/web/src/context/AppContext.jsx": 600,
  }).map(([file, max]) => ({
    files: [file],
    rules: { "max-lines": ["error", { max, skipBlankLines: true, skipComments: true }] },
  })),
);
