"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/backend-url";

export async function buildPlatformAdminHeaders(sessionCookie?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (sessionCookie) {
    headers.Cookie = `schoolbase_session=${sessionCookie}`;
    headers['X-Schoolbase-Session'] = sessionCookie;
  }

  return headers;
}

// Use API routes for backend operations.

export async function platformAdminLogoutAction(formData?: FormData): Promise<any> {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/auth/logout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }
    );
  } catch (error) {
    console.error("Logout failed:", error);
  }

  // Clear all session cookies (schoolbase_session is the main one set during login)
  const cookieStore = await cookies();
  cookieStore.delete('schoolbase_session'); // ✅ CRITICAL: This is the JWT cookie set during login
  cookieStore.delete('schoolbase_staff');   // Legacy fallback
  cookieStore.delete('schoolbase_parent');  // Legacy fallback

  // Redirect to login immediately
  redirect("/login");
}

export async function sendPlatformCommunicationEmailAction(...args: any[]): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;
    
    const emailData = args[0] as {
      targetType: 'school' | 'segment';
      selectedSchoolId?: string;
      selectedSegment?: string;
      emailType: string;
      subject: string;
      body: string;
    };

    const response = await fetch(`${backendUrl}/schoolbase-admin/api/emails/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: `schoolbase_session=${sessionCookie}` } : {}),
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send email (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to send platform email');
  }
}

export async function sendDirectCampaignEmailAction(data: {
  recipients: string[];
  emailType: string;
  subject: string;
  body: string;
}): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;

    const response = await fetch(`${backendUrl}/schoolbase-admin/api/campaigns/send`, {
      method: 'POST',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || `Failed to send campaign (${response.status})`);
    }

    return responseData;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to send campaign');
  }
}

export async function sendSetupCompletionRemindersAction(...args: any[]): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;

    const response = await fetch(`${backendUrl}/schoolbase-admin/api/reminders/send-bulk`, {
      method: 'POST',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send reminders (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to send reminders');
  }
}

export async function sendSetupCompletionReminder(schoolId: string): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;

    const response = await fetch(`${backendUrl}/schoolbase-admin/api/reminders/send-single`, {
      method: 'POST',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
      body: JSON.stringify({ schoolId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to send reminder (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to send reminder');
  }
}

export async function setSchoolPlanAction(formData: FormData): Promise<any> {
  const schoolId = formData.get('schoolId')?.toString();
  const plan = formData.get('plan')?.toString();

  if (!schoolId || !plan) {
    throw new Error('schoolId and plan are required.');
  }

  const backendUrl = getBackendUrl();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('schoolbase_session')?.value;

  const response = await fetch(`${backendUrl}/schoolbase-admin/api/schools`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `schoolbase_session=${sessionCookie}` } : {}),
    },
    body: JSON.stringify({ schoolId, action: 'setPlan', plan }),
  });

  const data = await response.json().catch(() => ({ message: 'Failed to parse response.' }));
  if (!response.ok) {
    throw new Error(data.message || `Failed to set plan (${response.status})`);
  }
  return data;
}

export async function approveSchoolSubscriptionAction(formData: FormData): Promise<any> {
  const schoolId = formData.get('schoolId')?.toString();
  const plan = formData.get('plan')?.toString();

  if (!schoolId || !plan) {
    throw new Error('schoolId and plan are required to approve a subscription.');
  }

  const backendUrl = getBackendUrl();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('schoolbase_session')?.value;

  const response = await fetch(`${backendUrl}/schoolbase-admin/api/schools`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `schoolbase_session=${sessionCookie}` } : {}),
    },
    body: JSON.stringify({ schoolId, action: 'setPlan', plan }),
  });

  const data = await response.json().catch(() => ({ message: 'Failed to parse response.' }));
  if (!response.ok) {
    throw new Error(data.message || `Failed to approve subscription (${response.status})`);
  }
  return data;
}

export async function rejectSchoolSubscriptionAction(formData: FormData): Promise<any> {
  const schoolId = formData.get('schoolId')?.toString();
  if (!schoolId) {
    throw new Error('schoolId is required to reject a subscription.');
  }

  const backendUrl = getBackendUrl();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('schoolbase_session')?.value;

  const response = await fetch(`${backendUrl}/schoolbase-admin/api/schools`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `schoolbase_session=${sessionCookie}` } : {}),
    },
    body: JSON.stringify({ schoolId, action: 'cancel' }),
  });

  const data = await response.json().catch(() => ({ message: 'Failed to parse response.' }));
  if (!response.ok) {
    throw new Error(data.message || `Failed to reject subscription (${response.status})`);
  }
  return data;
}

export async function createVideoAction(data: any): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;
    
    const response = await fetch(`${backendUrl}/schoolbase-admin/api/videos`, {
      method: 'POST',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || `Failed to create video (${response.status})`);
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create video');
  }
}

export async function updateVideoAction(videoId: string, data: any): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;
    
    const response = await fetch(`${backendUrl}/schoolbase-admin/api/videos/${videoId}`, {
      method: 'PATCH',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || `Failed to update video (${response.status})`);
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update video');
  }
}

export async function deleteVideoAction(videoId: string): Promise<any> {
  try {
    const backendUrl = getBackendUrl();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('schoolbase_session')?.value;
    
    const response = await fetch(`${backendUrl}/schoolbase-admin/api/videos/${videoId}`, {
      method: 'DELETE',
      headers: await buildPlatformAdminHeaders(sessionCookie),
      credentials: 'include',
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || `Failed to delete video (${response.status})`);
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to delete video');
  }
}
