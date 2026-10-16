import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

type RecordData = Record<string, unknown>;

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

function normalizeItem(value: unknown): RecordData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as RecordData;
  const nested = record.dataItem ?? record.item ?? record.data;
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as RecordData
    : record;
}

async function queryCollection(collectionId: string): Promise<RecordData[]> {
  const elevatedQuery = auth.elevate(items.query) as (
    id: string,
  ) => { limit: (count: number) => { find: () => Promise<unknown> } };
  const result = await elevatedQuery(collectionId).limit(100).find() as {
    items?: unknown[];
    dataItems?: unknown[];
    results?: unknown[];
  };
  const rows = result.items ?? result.dataItems ?? result.results;
  if (!Array.isArray(rows)) {
    throw new Error(`Wix returned an unrecognised query response for ${collectionId}.`);
  }
  return rows.map(normalizeItem).filter((item): item is RecordData => item !== null);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const GET: APIRoute = async () => {
  try {
    const [pathRows, planRows] = await Promise.all([
      queryCollection("LessonPaths"),
      queryCollection("LessonPathPlans"),
    ]);

    const lessonPaths = pathRows
      .filter((record) => record.isActive === true)
      .map((record) => ({
        id: text(record._id),
        title: text(record.title),
        slug: text(record.slug),
        introText: text(record.introText),
        learnerCategory: text(record.learnerCategory),
        transmission: text(record.transmission),
        isActive: record.isActive === true,
      }))
      .filter((record) => record.id && record.slug && record.learnerCategory && record.transmission);

    const lessonPathPlans = planRows
      .filter((record) => record.isActive !== false)
      .map((record) => ({
        id: text(record._id),
        title: text(record.title),
        lessonPathSlug: text(record.lessonPathSlug),
        pricingPlanId: text(record.pricingPlanId),
        displayOrder: typeof record.displayOrder === "number" ? record.displayOrder : 9999,
        isRecommended: record.isRecommended === true,
        recommendationLabel: text(record.recommendationLabel),
      }))
      .filter((record) => record.id && record.lessonPathSlug && record.pricingPlanId)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return json({ ok: true, lessonPaths, lessonPathPlans });
  } catch (error) {
    console.error("[BSDA Lesson Paths] CMS query failed:", error);
    return json({
      ok: false,
      message: "Lesson recommendations could not be loaded from Wix CMS.",
    }, 502);
  }
};
