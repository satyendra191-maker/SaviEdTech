import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        rules: {
            // TypeScript rules
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/triple-slash-reference": "off",
            "prefer-const": "warn",

            // React rules
            "react-hooks/exhaustive-deps": "warn",
            "react/no-unescaped-entities": "off",
            "react-hooks/rules-of-hooks": "error",

            // Next.js rules
            "@next/next/no-html-link-for-pages": "off",
            "@next/next/no-img-element": "warn",
        },
    },
    // Ignore patterns
    {
        ignores: [
            "node_modules/**",
            "dist/**",
            ".next/**",
            "out/**",
            "coverage/**",
            "*.config.js",
            "*.config.mjs",
            "*.config.ts",
        ],
    },
];

export default eslintConfig;
