import { createClient, ApiKeyStrategy, OAuthStrategy } from "@wix/sdk";
import { items } from "@wix/data";
import { members } from "@wix/members";
import wixConfig from "../wix.config.json";

const COLLECTION = "SiteContent";
const CLIENT_ID = process.env.WIX_CLIENT_ID || wixConfig.appId;
const API_KEY = process.env.WIX_API_KEY || "";
const SITE_ID = process.env.WIX_SITE_ID || "";
const ADMIN_EMAILS = (process.env.BSDA_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

function getAdminClient() {
  if (!API_KEY || !SITE_ID) {
    throw new Error("Wix admin API credentials are not configured on the server.");
  }

  return createClient({
    modules: { items },
    auth: ApiKeyStrategy({
      apiKey: API_KEY,
      siteId: SITE_ID,
    }),
  });
}

async function assertAdmin(req: any) {
  const authorization = String(req.headers?.authorization || "");
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) {
    throw new Error("You must be signed in to manage academy content.");
  }

  if (!CLIENT_ID) {
    throw new Error("Wix client ID is not configured on the server.");
  }

  const memberClient = createClient({
    modules: { members },
    auth: OAuthStrategy({
      clientId: CLIENT_ID,
      tokens: {
        accessToken: { value: accessToken },
      },
    }),
  });

  const response = await memberClient.members.getCurrentMember();
  const email = response.member?.loginEmail?.trim().toLowerCase();

  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new Error("This Wix account is not authorised to manage academy content.");
  }

  return email;
}

function normaliseUrl(value: unknown) {
  if (typeof value !== "string") return "";

  const url = value.trim();
  if (!url) return "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Enter a valid video URL.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http:// and https:// video URLs are supported.");
  }

  return parsed.toString();
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    try {
      const wix = getAdminClient();
      const result = await wix.items.query(COLLECTION).limit(100).find();
      return json(res, 200, { items: result.items || [] });
    } catch (error) {
      return json(res, 500, {
        error: error instanceof Error ? error.message : "Unable to load content.",
      });
    }
  }

  if (req.method === "PUT") {
    try {
      await assertAdmin(req);

      const body = req.body || {};
      const key = typeof body.key === "string" ? body.key.trim() : "";
      if (!/^(home-featured-video|reel-[1-6]|portal-video-[1-6])$/.test(key)) {
        return json(res, 400, { error: "Invalid content section." });
      }

      const url = normaliseUrl(body.url);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const type = typeof body.type === "string" ? body.type.trim() : "video";
      const enabled = body.enabled !== false;

      const wix = getAdminClient();
      const item = await wix.items.save(COLLECTION, {
        _id: key,
        key,
        url,
        title,
        type,
        enabled,
      });

      return json(res, 200, { item });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save content.";
      const status =
        message.includes("not authorised") || message.includes("must be signed")
          ? 403
          : 500;
      return json(res, status, { error: message });
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return json(res, 405, { error: "Method not allowed." });
}
