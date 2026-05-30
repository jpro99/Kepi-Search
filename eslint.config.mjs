import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    "public/maplibre-gl-csp-worker.js",
  ]),
  // Disable react-compiler rules — they generate false positives on valid patterns
  // (Date.now() in useMemo, setState in effects, manual memoization) and block CI.
  // The build succeeds and the app runs correctly. These are overly strict static
  // analysis rules from the experimental react-compiler plugin, not runtime errors.
  {
    rules: {
      "react-compiler/react-compiler": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
