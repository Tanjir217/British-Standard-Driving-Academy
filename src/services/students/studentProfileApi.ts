import { getWixTokens } from "../wix/client";

export interface StudentProfileApiRecord {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhotoUrl: string;
  coverPhotoUrl?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  slug?: string;
  privacyStatus?: string;
  activityStatus?: string;
  contactId?: string;
  lastLoginDate?: string | null;
  createdDate?: string | null;
  updatedDate?: string | null;
  transmission?: "manual" | "automatic" | "either";
  assignedInstructorId?: string;
  enrolledPackageId?: string;
  lessonsCompleted: number | null;
  lessonsRemaining: number | null;
  progressPercent: number | null;
  status?: "active" | "paused" | "completed" | "inactive";
}

type ProfileResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  profileState?: "missing" | "ready";
  profile?: StudentProfileApiRecord | null;
  created?: boolean;
};

export class StudentProfileApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StudentProfileApiError";
  }
}

async function fetchAuthenticatedProfile(input: RequestInit): Promise<Response> {
  const accessToken = getWixTokens()?.accessToken?.value;
  if (!accessToken) {
    throw new StudentProfileApiError(
      "Your Wix sign-in session is not available in this browser. Please sign in again.",
      "UNAUTHENTICATED",
      401,
    );
  }

  // Send the active Headless OAuth access token to our same-origin API.
  // The server validates it with Wix before resolving the FullData record.
  return fetch("/api/students/profile", {
    ...input,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(input.headers || {}),
    },
  });
}

async function readResponse(response: Response): Promise<ProfileResponse> {
  const payload = (await response.json().catch(() => null)) as ProfileResponse | null;
  if (!payload || typeof payload !== "object") {
    throw new StudentProfileApiError(
      "The student profile service returned an invalid response.",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  if (!response.ok || payload.ok !== true) {
    throw new StudentProfileApiError(
      payload.message || "We could not access your student profile.",
      payload.code || "PROFILE_REQUEST_FAILED",
      response.status,
    );
  }

  return payload;
}

export async function getStudentProfile(): Promise<ProfileResponse> {
  const response = await fetchAuthenticatedProfile({ method: "GET" });
  return readResponse(response);
}

export async function createStudentProfile(input: {
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<ProfileResponse> {
  const response = await fetchAuthenticatedProfile({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResponse(response);
}

export async function updateStudentProfile(input: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  transmission?: "manual" | "automatic" | "either";
}): Promise<ProfileResponse> {
  const response = await fetchAuthenticatedProfile({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResponse(response);
}
