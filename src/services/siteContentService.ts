export type SiteContentItem = {
  _id?: string;
  key: string;
  url: string;
  title?: string;
  type?: string;
  enabled?: boolean;
};

export type SiteContentMap = Record<string, SiteContentItem>;

export async function getSiteContent(): Promise<SiteContentMap> {
  const response = await fetch("/api/content", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("We could not load the academy content.");
  }

  const data = (await response.json()) as { items?: SiteContentItem[] };
  return Object.fromEntries(
    (data.items ?? []).map((item) => [item.key, item]),
  );
}

export async function saveSiteContent(
  item: Pick<SiteContentItem, "key" | "url" | "title" | "type" | "enabled">,
): Promise<SiteContentItem> {
  const { getWixTokens } = await import("./wix");

  const tokens = getWixTokens();
  const accessToken =
    typeof tokens?.accessToken?.value === "string"
      ? tokens.accessToken.value
      : "";

  if (!accessToken) {
    throw new Error("Your Wix admin session has expired. Please sign in again.");
  }

  const response = await fetch("/api/content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(item),
  });

  const data = (await response.json().catch(() => ({}))) as {
    item?: SiteContentItem;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "We could not save this content.");
  }

  return data.item ?? item;
}
