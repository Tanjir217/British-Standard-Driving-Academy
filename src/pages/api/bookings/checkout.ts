import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { availabilityTimeSlots } from "@wix/bookings";
import { redirects } from "@wix/redirects";

type WixRecord = Record<string, unknown>;
type AuthenticatedMember = {
  _id: string;
  contactId?: string | null;
  loginEmail?: string | null;
  email?: string | null;
  contact?: { contactId?: string | null } | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function stringField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeRecord(value: unknown): WixRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as WixRecord;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as WixRecord
    : record;
}

function recordsFromQuery(value: unknown): WixRecord[] {
  if (!value || typeof value !== "object") return [];
  const response = value as WixRecord;
  const possible = response.items ?? response.dataItems ?? response.results;
  return Array.isArray(possible)
    ? possible.map(normalizeRecord).filter((record): record is WixRecord => record !== null)
    : [];
}

async function hasVerifiedFullDataRecord(member: AuthenticatedMember): Promise<boolean> {
  const contactId = stringField(member.contactId ?? member.contact?.contactId, 160);
  const email = stringField(member.loginEmail ?? member.email, 254).toLowerCase();
  if (!contactId && !email) throw new Error("MEMBER_IDENTIFIERS_MISSING");

  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const records = recordsFromQuery(await elevatedQuery(collectionId).limit(100).find());

  const matches = records.filter((record) => {
    const recordContactId = stringField(record.contactId, 160);
    const recordEmail = stringField(record.loginEmail ?? record.email, 254).toLowerCase();
    return Boolean(contactId && recordContactId === contactId)
      || Boolean(email && recordEmail === email);
  });

  if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (!matches.length) return false;

  const recordContactId = stringField(matches[0].contactId, 160);
  const recordName = [
    stringField(matches[0].firstName, 80),
    stringField(matches[0].lastName, 80),
  ].filter(Boolean).join(" ") || stringField(matches[0].nickname, 160);
  const recordEmail = stringField(matches[0].loginEmail ?? matches[0].email ?? email, 254);
  return Boolean(recordContactId && recordName && recordEmail);
}

export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, any>;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) {
      return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The booking request is too large." }, 413);
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid object");
    body = parsed as Record<string, any>;
  } catch {
    return json({ ok: false, code: "INVALID_JSON", message: "Send a valid JSON object." }, 400);
  }

  const slot = body.slot && typeof body.slot === "object" ? body.slot : null;
  if (!slot) {
    return json({ ok: false, code: "VALIDATION_ERROR", message: "Choose an available booking slot." }, 400);
  }

  const serviceId = stringField(slot.serviceId, 120);
  const scheduleId = stringField(slot.scheduleId, 120);
  const startDate = stringField(slot.startDate, 80);
  const endDate = stringField(slot.endDate, 80);
  const localStartDate = stringField(slot.localStartDate, 80);
  const timeZone = stringField(slot.timeZone, 100) || "Europe/London";

  if (!serviceId || !scheduleId || !startDate || !endDate
    || !/^\d{4}-\d{2}-\d{2}/.test(localStartDate) || slot.bookable !== true) {
    return json({ ok: false, code: "INVALID_SLOT", message: "Choose a valid available slot before checkout." }, 400);
  }

  try {
    const currentResponse = await members.getCurrentMember();
    const member = currentResponse.member as AuthenticatedMember | undefined;
    if (!member?._id) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in with your BSDA account before booking." }, 401);
    }

    if (!(await hasVerifiedFullDataRecord(member))) {
      return json({ ok: false, code: "FULLDATA_PROFILE_REQUIRED", message: "No complete matching BSDA student record was found. Please contact the academy before booking." }, 403);
    }

    // Re-query availability on the server; never trust a browser-provided slot as bookable.
    const availability = await availabilityTimeSlots.listAvailabilityTimeSlots({
      serviceId,
      fromLocalDate: localStartDate.slice(0, 10),
      toLocalDate: localStartDate.slice(0, 10),
      timeZone,
      bookable: true,
    });
    const freshSlot = (availability.timeSlots ?? []).find((candidate: any) =>
      candidate.bookable === true
      && candidate.serviceId === serviceId
      && candidate.scheduleId === scheduleId
      && candidate.startDate === startDate
      && candidate.endDate === endDate,
    );

    if (!freshSlot) {
      return json({ ok: false, code: "SLOT_UNAVAILABLE", message: "That time is no longer available. Refresh availability and choose another slot." }, 409);
    }

    // The generated Redirects SDK expects SlotAvailability.bookable to be
    // boolean | undefined, while the availability API's TimeSlot permits null.
    // Normalize the server-verified slot instead of passing the incompatible
    // SDK response object directly. The request timezone is authoritative here.
    const slotAvailability = {
      ...freshSlot,
      bookable: freshSlot.bookable === true,
    };

    // Wix owns the booking checkout and payment UI. The return URL is not proof of payment.
    const response = await redirects.createRedirectSession({
      bookingsCheckout: {
        slotAvailability,
        timezone: timeZone,
      },
      callbacks: {
        postFlowUrl: "https://www.bsda.online/?bsdaPayment=return",
      },
    });

    const redirectUrl = response.redirectSession?.fullUrl;
    if (typeof redirectUrl !== "string" || !redirectUrl.startsWith("https://")) {
      console.error("[BSDA checkout] Wix returned no valid HTTPS checkout URL.");
      return json({ ok: false, code: "CHECKOUT_URL_MISSING", message: "Wix could not prepare secure checkout. Please try again." }, 502);
    }

    return json({ ok: true, redirectUrl });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA checkout] Checkout session creation failed:", reason);
    if (reason === "MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "We couldn't verify your BSDA account. Please sign in again." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your BSDA account has conflicting student records. Please contact the academy." }, 409);
    }
    return json({ ok: false, code: "CHECKOUT_CREATE_FAILED", message: "Wix could not prepare checkout. Please check that online payment is enabled for this service and try again." }, 502);
  }
};
