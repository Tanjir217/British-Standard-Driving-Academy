import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Wix serves the root document but doesn't consistently apply an SPA fallback
 * to nested URLs. Publish physical copies of the built entry document for the
 * admin routes so direct navigation and refresh work on Wix static hosting.
 * React Router still selects the correct page from window.location.pathname.
 */
function wixAdminRouteDocuments() {
  return {
    name: "wix-admin-route-documents",
    apply: "build",
    async closeBundle() {
      const dist = join(projectRoot, "dist");
      const source = join(dist, "index.html");
      const targets = [
        join(dist, "admin", "index.html"),
        join(dist, "admin", "login", "index.html"),
        join(dist, "admin.html"),
        join(dist, "admin", "login.html"),
      ];

      for (const target of targets) {
        await mkdir(dirname(target), { recursive: true });
        await copyFile(source, target);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), wixAdminRouteDocuments()],
  server: { port: 5173, host: true },
});
