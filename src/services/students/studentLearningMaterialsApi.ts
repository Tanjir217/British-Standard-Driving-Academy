export interface StudentLearningVideo {
  key: string;
  url: string;
  title: string;
}

type LearningMaterialsResponse = { ok?: boolean; videos?: StudentLearningVideo[]; message?: string };

export async function listStudentLearningVideos(): Promise<StudentLearningVideo[]> {
  const response = await fetch("/api/students/learning-materials", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null) as LearningMaterialsResponse | null;
  if (!response.ok || !payload?.ok || !Array.isArray(payload.videos)) {
    throw new Error(payload?.message || "Learning materials could not be loaded.");
  }
  return payload.videos;
}
