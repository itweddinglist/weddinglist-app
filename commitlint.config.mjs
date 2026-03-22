const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "refactor", "chore", "docs", "perf", "test"],
    ],
    "subject-min-length": [2, "always", 10],
    "subject-case": [2, "always", "lower-case"],
  },
};

export default config;