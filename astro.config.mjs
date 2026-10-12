import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import wixCloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";

const isProductionBuild = process.env.NODE_ENV === "production";

// The Wix adapter is used for production builds. The Wix CLI owns the local
// development/preview runtime. Do not link or release until the intended
// existing bsda.online site binding is verified.
export default defineConfig({
  site: "https://bsda.online",
  output: "server",
  integrations: [wix(), wixPages(), react()],
  ...(isProductionBuild && {
    adapter: wixCloudProviderFetchAdapter({}),
  }),
});
