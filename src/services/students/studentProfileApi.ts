import { httpClient } from "@wix/essentials";

export interface StudentProfileApiRecord {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  profilePhotoUrl: string;
  transmission: "manual" | "automatic" | "either";
  assignedInstructorId?: string;
  enrolledPackageId?: string;
  lessonsCompleted: number;
  lessonsRemaining: number;
  progressPercent: number;
  status: "active" | "paused" | "completed" | "inactive";
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
  const response = await httpClient.fetchWithAuth("/api/students/profile", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return readResponse(response);
}

export async function createStudentProfile(input: {
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<ProfileResponse> {
  const response = await httpClient.fetchWithAuth("/api/students/profile", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
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
  const response = await httpClient.fetchWithAuth("/api/students/profile", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readResponse(response);
}
