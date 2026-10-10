// @ts-ignore Node built-ins are available to Vite at config runtime; this project currently omits @types/node.
import { copyFile, mkdir } from "node:fs/promises";
// @ts-ignore Node built-ins are available to Vite at config runtime; this project currently omits @types/node.
import { dirname, join } from "node:path";
// @ts-ignore Node built-ins are available to Vite at config runtime; this project currently omits @types/node.
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Publish entry-document copies for admin routes so direct navigation can load
 * the React app on static hosts. React Router selects the page from the URL.
 */
function wixAdminRouteDocuments(): Plugin {
  return {
    name: "wix-admin-route-documents",
    apply: "build" as const,
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
