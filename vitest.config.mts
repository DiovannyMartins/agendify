import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./tests/setup.ts"],
          include: [
            "lib/**/*.test.{ts,tsx}",
            "app/**/*.test.{ts,tsx}",
            "components/**/*.test.{ts,tsx}",
          ],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.integration.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // Integration files share the remote project; running them in parallel
          // triggers a transient `businesses_owner_id_fkey` race on setup. Serial
          // file execution makes the suite deterministic.
          fileParallelism: false,
        },
      },
    ],
  },
});
