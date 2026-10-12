import type { APIRoute } from "astro";
import { authorizeAdminMember } from "../../../lib/server/admin-authorization";

export const GET: APIRoute = async () => {
  const authorization = await authorizeAdminMember();
  if (!authorization.authorized) {
    return new Response(JSON.stringify({
      ok: true,
      authorized: false,
      code: authorization.status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
    }), {
      status: authorization.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    authorized: true,
    access: authorization.access,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
