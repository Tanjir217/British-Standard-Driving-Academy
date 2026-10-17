import { wixClient } from "./wix/client";

export type VideoLibraryItem = {
  _id?: string;
  title?: string;
  videoUrl?: string;
  videoType?: string;
  sectionKey?: string;
  description?: string;
  thumbnailUrl?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  category?: string;
};

/**
 * Loads the single active, featured, full-length video assigned to the
 * homepage's home-featured section from the public Wix VideoLibrary CMS.
 */
export async function getHomeFeaturedVideo(): Promise<VideoLibraryItem | null> {
  const result = await wixClient.items
    .query("VideoLibrary")
    .eq("sectionKey", "home-featured")
    .eq("videoType", "full")
    .eq("isActive", true)
    .eq("isFeatured", true)
    .ascending("displayOrder")
    .limit(1)
    .find();

  const item = result.items?.[0] as VideoLibraryItem | undefined;
  return item ?? null;
}

/**
 * Loads active YouTube Shorts/Reels assigned to the homepage social-reels
 * section. Collection items are read-only and sorted in CMS display order.
 */
export async function getHomeReels(limit = 6): Promise<VideoLibraryItem[]> {
  const result = await wixClient.items
    .query("VideoLibrary")
    .eq("sectionKey", "home-reels")
    .eq("videoType", "reel")
    .eq("isActive", true)
    .ascending("displayOrder")
    .limit(Math.min(Math.max(limit, 1), 20))
    .find();

  return (result.items ?? []) as VideoLibraryItem[];
}
