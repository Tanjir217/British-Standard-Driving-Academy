import { createClient, OAuthStrategy } from "@wix/sdk";
import { extendedBookings } from "@wix/bookings";
import wixConfig from "../../wix.config.json";

const clientId = process.env.WIX_HEADLESS_CLIENT_ID ?? wixConfig.appId;

function send(res: any, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed." });
  }

  if (!clientId) {
    return send(res, 500, { error: "Wix Headless client ID is not configured." });
  }

  const { accessToken } = req.body ?? {};

  if (!accessToken?.value) {
    return send(res, 401, {
      error: "A Wix member session is required.",
      debug: process.env.NODE_ENV !== "production"
        ? { name: "MissingAccessToken", message: "No access token was supplied." }
        : undefined,
    });
  }

  try {
    const client = createClient({
      auth: OAuthStrategy({
        clientId,
        tokens: {
          accessToken,
          refreshToken: {
            value: "",
            role: "member",
          },
        },
      }),
      modules: { extendedBookings },
    });

    // Query Extended Bookings requires booking-reader permissions. A signed-in
    // site owner/collaborator with the Wix Admin identity can satisfy this,
    // while an ordinary member cannot.
    await client.extendedBookings.queryExtendedBookings(
      { cursorPaging: { limit: 1 } },
      {},
    );

    return send(res, 200, { data: { isAdmin: true } });
  } catch (error) {
    console.error("BSDA admin session validation failed:", error);

    const debug =
      process.env.NODE_ENV !== "production"
        ? {
            name: error instanceof Error ? error.name : "UnknownError",
            message:
              error instanceof Error
                ? error.message
                : String(error),
          }
        : undefined;

    const message =
      error instanceof Error
        ? error.message
        : "Administrator access could not be verified.";

    if (/403|forbidden|permission|unauthori[sz]ed/i.test(message)) {
      return send(res, 403, {
        error: "This account does not have administrator access.",
        debug,
      });
    }

    if (/401|invalid.*token|expired.*token|authentication/i.test(message)) {
      return send(res, 401, {
        error: "Your administrator session has expired. Please sign in again.",
        debug,
      });
    }

    return send(res, 500, {
      error: "We could not verify administrator access right now.",
      debug,
    });
  }
}
