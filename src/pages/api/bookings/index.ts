import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";
import { availabilityTimeSlots, bookings } from "@wix/bookings";

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

async function findAuthenticatedFullDataRecord(member: AuthenticatedMember): Promise<WixRecord | null> {
  const contactId = String(member.contactId ?? member.contact?.contactId ?? "").trim();
  const email = String(member.loginEmail ?? member.email ?? "").trim().toLowerCase();
  if (!contactId && !email) {
    throw new Error("MEMBER_IDENTIFIERS_MISSING");
  }

  const collectionId = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";
  const elevatedQuery = auth.elevate(items.query) as (...args: any[]) => any;
  const records = recordsFromQuery(await elevatedQuery(collectionId).limit(100).find());

  const contactMatches = contactId
    ? records.filter((record) => String(record.contactId ?? "").trim() === contactId)
    : [];
  if (contactMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  if (contactMatches.length === 1) return contactMatches[0];

  const emailMatches = email
    ? records.filter((record) => String(record.loginEmail ?? record.email ?? "").trim().toLowerCase() === email)
    : [];
  if (emailMatches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  return emailMatches[0] ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE", message: "Send a JSON request body." }, 415);
  }

  let body: Record<string, any>;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "The booking request is too large." }, 413);
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
  const timeZone = stringField(slot.timeZone, 100) || "Europe/London";
  const localStartDate = stringField(slot.localStartDate, 80);

  if (!serviceId || !scheduleId || !startDate || !endDate || !/^\d{4}-\d{2}-\d{2}/.test(localStartDate) || slot.bookable !== true) {
    return json({ ok: false, code: "INVALID_SLOT", message: "Choose a valid available slot before booking." }, 400);
  }

  try {
    // Fail closed: a browser-submitted name/email is not proof of account ownership.
    const currentResponse = await members.getCurrentMember();
    const member = currentResponse.member as AuthenticatedMember | undefined;
    if (!member || typeof member._id !== "string" || !member._id) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in with your BSDA account before booking." }, 401);
    }

    const student = await findAuthenticatedFullDataRecord(member);
    if (!student) {
      return json({ ok: false, code: "FULLDATA_PROFILE_REQUIRED", message: "No matching BSDA student account was found. Create an account or contact the academy before booking." }, 403);
    }

    const firstName = stringField(student.firstName, 80);
    const lastName = stringField(student.lastName, 80);
    const nickname = stringField(student.nickname, 160);
    const recordName = [firstName, lastName].filter(Boolean).join(" ") || nickname;
    const nameParts = recordName.split(/\s+/).filter(Boolean);
    const verifiedFirstName = nameParts.shift() || "";
    const verifiedLastName = nameParts.join(" ");
    const email = stringField(student.loginEmail ?? student.email ?? member.loginEmail ?? member.email, 254).toLowerCase();
    const contactId = stringField(student.contactId, 160);
    const phone = stringField(student.phone, 40) || stringField(body.phone, 40);

    if (!verifiedFirstName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !contactId) {
      return json({ ok: false, code: "FULLDATA_PROFILE_INCOMPLETE", message: "Your BSDA account record is incomplete. Please update it or contact the academy before booking." }, 409);
    }

    // Never trust the client-side slot's bookable flag. Re-query Wix immediately
    // before creating the booking and match the actual service, schedule, and time.
    const availability = await availabilityTimeSlots.listAvailabilityTimeSlots({
      serviceId,
      fromLocalDate: `${localStartDate.slice(0, 10)}T00:00:00`,
      toLocalDate: `${localStartDate.slice(0, 10)}T23:59:59`,
      timeZone,
      bookable: true,
    });
    const freshSlots = (availability.timeSlots ?? []) as any[];
    const freshSlot = freshSlots.find((candidate: any) =>
      candidate.bookable === true &&
      candidate.serviceId === serviceId &&
      candidate.scheduleId === scheduleId &&
      candidate.startDate === startDate &&
      candidate.endDate === endDate,
    );

    if (!freshSlot) {
      return json({ ok: false, code: "SLOT_UNAVAILABLE", message: "That time is no longer available. Refresh availability and choose another slot." }, 409);
    }

    const createBooking = bookings.createBooking as (input: any) => Promise<any>;
    const result = await createBooking({
      contactDetails: {
        contactId,
        firstName: verifiedFirstName,
        lastName: verifiedLastName,
        email,
        ...(phone ? { phone } : {}),
      },
      totalParticipants: 1,
      bookedEntity: {
        slot: {
          startDate: freshSlot.startDate,
          endDate: freshSlot.endDate,
          location: freshSlot.location,
          resource: freshSlot.availableResources?.[0]?.resources?.[0],
          serviceId: freshSlot.serviceId,
          timezone: freshSlot.timeZone || timeZone,
          scheduleId: freshSlot.scheduleId,
        },
      },
      ...(typeof body.notes === "string" && body.notes.trim()
        ? { additionalFields: [{ label: "Notes", value: body.notes.trim().slice(0, 2000) }] }
        : {}),
    });

    const booking = result?.booking ?? result;
    const id = String(booking?._id ?? booking?.id ?? "");
    if (!id) {
      console.error("[BSDA bookings] Wix returned no booking ID.");
      return json({ ok: false, code: "BOOKING_RESPONSE_INVALID", message: "Wix did not confirm a booking reference." }, 502);
    }

    return json({
      ok: true,
      booking: {
        id,
        status: String(booking.status ?? "UNKNOWN"),
        startDate: String(booking.startDate ?? freshSlot.startDate),
        endDate: String(booking.endDate ?? freshSlot.endDate),
      },
    }, 201);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA bookings] Booking creation failed:", reason);
    if (reason === "MEMBER_IDENTIFIERS_MISSING") {
      return json({ ok: false, code: "MEMBER_IDENTIFIERS_MISSING", message: "We couldn't verify your BSDA account identity. Please sign in again or contact the academy." }, 422);
    }
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your BSDA account has conflicting student records. Please contact the academy before booking." }, 409);
    }
    return json({ ok: false, code: "BOOKING_CREATE_FAILED", message: "Wix could not verify your account or create this booking. Please try again." }, 502);
  }
};
