import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import wix from "@wix/astro";

// Wix's Astro integration supplies the Wix-managed runtime and authentication
// integration. Do not run "wix headless link" against this repository until
// the existing bsda.online site binding has been explicitly verified.
export default defineConfig({
  output: "server",
  integrations: [react(), wix()],
});
