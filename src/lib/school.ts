import { getStaffSession } from "@/lib/auth";
import { buildApiUrl } from "@/lib/api-client";
import { cookies } from "next/headers";

// Fetch school data from the backend API instead of direct database access
async function fetchSchoolFromAPI(schoolId: string, role: string) {
  try {
    const url = role === "TEACHER"
      ? buildApiUrl("/teacher/school")
      : buildApiUrl(`/admin/school/${encodeURIComponent(schoolId)}`);
    const cookieStore = await cookies();
    const sessionCookie =
      cookieStore.get("schoolbase_session")?.value ||
      cookieStore.get("schoolbase_staff")?.value ||
      cookieStore.get("staff_session")?.value;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: `schoolbase_session=${sessionCookie}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `Failed to fetch school ${schoolId} from ${url}: ${response.status}`,
        body,
      );
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching school ${schoolId}:`, error);
    return null;
  }
}

export async function getCurrentSchool() {
  const session = await getStaffSession();

  if (!session) {
    throw new Error("No session found. Please log in.");
  }

  if (!session.schoolId) {
    console.error("Staff session has no schoolId:", session);
    throw new Error("Your session is invalid. Please log in again.");
  }

  const school = await fetchSchoolFromAPI(session.schoolId, session.role);
  if (!school) {
    console.error(`School not found or backend unavailable for staff session: ${session.schoolId}`);
    throw new Error("Your school information could not be loaded. Please log in again.");
  }

  return school;
}

export async function getCurrentSchoolId() {
  const school = await getCurrentSchool();
  return school.id;
}
