// eslint.config.js
import js from "@eslint/js";

export default [
  { ignores: ["dist/**", "node_modules/**"] },

  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
  window: "readonly",
  document: "readonly",
  console: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  fetch: "readonly",
  setTimeout: "readonly",
},

    },
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error",
      "no-var": "error",
      "prefer-const": "warn",
      "no-console": "off",
    },
  },
];
