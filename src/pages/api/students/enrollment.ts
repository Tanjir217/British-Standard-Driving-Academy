import type { APIRoute } from "astro";
import { orders } from "@wix/pricing-plans";
import { members } from "@wix/members";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const GET: APIRoute = async () => {
  try {
    const current = await members.getCurrentMember();
    const member = asRecord(current.member);
    const memberId = String(member._id ?? member.id ?? "");
    if (!memberId) {
      return json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in to view your enrollment." }, 401);
    }

    // Wix's member-scoped order API only returns the current member's own
    // pricing-plan orders; do not query all site orders and filter in the browser.
    const result = await orders.memberListOrders({});
    const response = asRecord(result);
    const values = response.orders ?? response.items;
    if (!Array.isArray(values)) {
      return json({ ok: false, code: "INVALID_ORDERS_RESPONSE", message: "Enrollment records could not be read." }, 502);
    }

    const enrollments = values.map((value: unknown) => {
      const order = asRecord(value);
      const plan = asRecord(order.plan);
      const buyer = asRecord(order.buyer);
      return {
        id: String(order._id ?? order.id ?? ""),
        planId: String(order.planId ?? plan._id ?? plan.id ?? ""),
        planName: String(order.planName ?? plan.name ?? ""),
        status: String(order.status ?? "UNKNOWN"),
        startDate: typeof order.startDate === "string" ? order.startDate : "",
        endDate: typeof order.endDate === "string" ? order.endDate : "",
        paymentStatus: String(order.paymentStatus ?? "UNKNOWN"),
        buyerMemberId: String(buyer.memberId ?? ""),
      };
    }).filter((order) => order.id && (!order.buyerMemberId || order.buyerMemberId === memberId));

    return json({ ok: true, enrollments });
  } catch (error) {
    console.error("[BSDA student enrollment] Wix Pricing Plans query failed:", error instanceof Error ? error.message : "Unknown error");
    return json({ ok: false, code: "ENROLLMENT_LOOKUP_FAILED", message: "We could not load your pricing-plan enrollment. Verify Wix Pricing Plans member-order permissions." }, 502);
  }
};
