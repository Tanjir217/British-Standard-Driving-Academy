/**
 * Wix-managed Headless server entry point.
 * Wix expects the configured server output to expose an entry.mjs module.
 * Keep the API implementation in index.js and re-export its Worker handler.
 */
export { default } from "./index.js";
