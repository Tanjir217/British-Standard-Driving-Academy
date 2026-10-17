import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import wixCloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";

export default defineConfig({
  site: "https://bsda.online",
  output: "server",
  adapter: wixCloudProviderFetchAdapter({}),
  integrations: [wix(), wixPages(), react()],
});
