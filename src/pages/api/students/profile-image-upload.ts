import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { files } from "@wix/media";
import { members } from "@wix/members";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    },
  });
}

function originIsAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!originIsAllowed(request)) {
    return json({ ok: false, code: "INVALID_ORIGIN", message: "This image upload request could not be verified." }, 403);
  }

  try {
    const currentMember = await members.getCurrentMember();
    if (!currentMember.member?._id) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to upload a profile image." }, 401);
    }

    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send image metadata as JSON." }, 415);
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const sizeInBytes = Number(body?.sizeInBytes);
    if (
      !fileName ||
      fileName.length > 180 ||
      /[\\/\u0000-\u001f]/.test(fileName) ||
      !ALLOWED_IMAGE_TYPES.has(mimeType) ||
      !Number.isSafeInteger(sizeInBytes) ||
      sizeInBytes < 1 ||
      sizeInBytes > MAX_IMAGE_BYTES
    ) {
      return json({ ok: false, code: "INVALID_IMAGE", message: "Choose a JPG, PNG, WebP, or GIF image up to 5 MB." }, 400);
    }

    // Wix's generated upload URL accepts the MIME type and upload options.
    // Keep the request minimal and use the documented filename option.
    const generateUploadUrl = auth.elevate(files.generateFileUploadUrl) as (mimeType: string, options: { fileName: string; private?: boolean }) => Promise<{ uploadUrl?: string }>;
    const result = await generateUploadUrl(mimeType, {
      fileName,
      private: false,
    });
    if (!result?.uploadUrl || !/^https:\/\//i.test(result.uploadUrl)) {
      throw new Error("WIX_MEDIA_UPLOAD_URL_MISSING");
    }

    return json({ ok: true, uploadUrl: result.uploadUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA profile image upload] Could not generate Wix Media upload URL:", reason);
    return json({
      ok: false,
      code: "IMAGE_UPLOAD_PREPARATION_FAILED",
      message: "We could not prepare the image upload. Please try again.",
    }, 503);
  }
};
