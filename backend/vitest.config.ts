import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["services/**", "middleware/**", "controllers/**"],
            exclude: ["**/*.test.ts"],
        },
    },
});
