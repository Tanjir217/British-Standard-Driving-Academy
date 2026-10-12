/**
 * Minimal health check for the isolated Vercel backend test.
 * Does not inspect or return environment variables or secrets.
 */
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "bsda-vercel-backend-test",
  });
}
