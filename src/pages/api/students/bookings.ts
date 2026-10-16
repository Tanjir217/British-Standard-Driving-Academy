import type { APIRoute } from "astro";
import { extendedBookings } from "@wix/bookings";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { members } from "@wix/members";

type RecordValue = Record<string, unknown>;
const FULL_DATA_COLLECTION_ID = import.meta.env.BSDA_FULLDATA_COLLECTION_ID || "Members/FullData";

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

function asRecord(value: unknown): RecordValue | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as RecordValue;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested) ? nested as RecordValue : record;
}

function records(value: unknown): RecordValue[] {
  if (!value || typeof value !== "object") return [];
  const response = value as RecordValue;
  const values = response.items ?? response.bookings ?? response.extendedBookings ?? response.dataItems ?? response.results;
  return Array.isArray(values) ? values.map(asRecord).filter((record): record is RecordValue => record !== null) : [];
}

async function getMember(): Promise<{ memberId: string; contactId: string; email: string } | null> {
  // Use only the Wix Astro-managed request session. Browser-supplied bearer
  // tokens are not accepted as a second student authentication mechanism.
  const managed = await members.getCurrentMember();
  const member = managed.member as Record<string, any> | undefined;
  const memberId = member?._id ?? member?.id;
  if (typeof memberId !== "string" || !memberId) return null;
  const contact = member.contact && typeof member.contact === "object" ? member.contact : {};
  return {
    memberId,
    contactId: String(member.contactId ?? contact.contactId ?? "").trim(),
    email: String(member.loginEmail ?? member.email ?? contact.email ?? "").trim().toLowerCase(),
  };
}

async function findFullData(contactId: string, email: string): Promise<RecordValue | null> {
  const query = auth.elevate(items.query) as (...args: any[]) => any;
  const rows = records(await query(FULL_DATA_COLLECTION_ID).limit(500).find());
  const matches = contactId
    ? rows.filter((row) => String(row.contactId ?? "").trim().toLowerCase() === contactId.toLowerCase())
    : rows.filter((row) => String(row.loginEmail ?? row.email ?? "").trim().toLowerCase() === email);
  if (matches.length > 1) throw new Error("DUPLICATE_FULLDATA_MEMBER");
  return matches[0] ?? null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const GET: APIRoute = async () => {
  try {
    const member = await getMember();
    if (!member) return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your bookings." }, 401);
    if (!member.contactId) {
      return json({ ok: false, code: "MEMBER_CONTACT_ID_MISSING", message: "Your Wix session does not expose contactId, so booking ownership cannot be verified." }, 422);
    }
    const fullData = await findFullData(member.contactId, member.email);
    if (!fullData) return json({ ok: true, bookings: [], profileState: "missing" });
    const activityStatus = String(fullData.activityStatus ?? "").trim().toLowerCase();
    if (activityStatus && activityStatus !== "active") {
      return json({ ok: false, code: "MEMBER_INACTIVE", message: "Your BSDA account is not active." }, 403);
    }

    // Filter at Wix's query layer and re-check ownership in memory before returning.
    const queryResult = await extendedBookings.queryExtendedBookings({
      filter: {
        "contactDetails.contactId": { $eq: member.contactId },
      },
      sort: [{ fieldName: "startDate", order: "ASC" }],
      cursorPaging: { limit: 100 },
    }, {});
    const bookings = records(queryResult)
      .map((entry) => {
        const booking = asRecord(entry.booking) ?? entry;
        const contact = asRecord(booking.contactDetails) ?? {};
        const bookedEntity = asRecord(booking.bookedEntity) ?? {};
        const slot = asRecord(bookedEntity.slot) ?? asRecord(asRecord(bookedEntity.item)?.slot) ?? {};
        const resource = asRecord(slot.resource) ?? {};
        return {
          id: text(booking._id ?? booking.id),
          contactId: text(contact.contactId),
          serviceId: text(slot.serviceId),
          serviceName: text(slot.serviceName),
          instructorId: text(resource._id ?? resource.id),
          instructorName: text(resource.name),
          startDate: text(booking.startDate ?? slot.startDate),
          endDate: text(booking.endDate ?? slot.endDate),
          status: text(booking.status) || "UNKNOWN",
          paymentStatus: text(booking.paymentStatus) || "UNKNOWN",
        };
      })
      .filter((booking) => booking.id && booking.contactId === member.contactId);

    return json({ ok: true, bookings });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[BSDA student bookings] GET failed:", reason);
    if (reason === "DUPLICATE_FULLDATA_MEMBER") {
      return json({ ok: false, code: "PROFILE_CONFLICT", message: "Your student record needs academy support." }, 409);
    }
    return json({ ok: false, code: "BOOKINGS_LOOKUP_FAILED", message: "We could not load your bookings. Verify the Wix Bookings query and FullData configuration." }, 502);
  }
};
