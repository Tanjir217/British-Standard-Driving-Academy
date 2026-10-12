import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Minimal health check for the isolated Vercel backend test.
 * It deliberately does not inspect or return environment variables or secrets.
 */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "bsda-vercel-backend-test",
  });
}
