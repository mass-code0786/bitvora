import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: [
    { find: /^@\//, replacement: `${fileURLToPath(new URL("./", import.meta.url))}/` },
    { find: "server-only", replacement: fileURLToPath(new URL("./test/server-only.ts", import.meta.url)) },
  ] },
  test: { environment: "node", setupFiles:["./test/setup.ts"], coverage: { provider: "v8", reporter: ["text", "html"] } },
});
