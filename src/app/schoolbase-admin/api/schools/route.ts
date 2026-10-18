import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend-url";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const status = searchParams.get("status");
    const backendUrl = getBackendUrl();
    const statusQuery = status ? `&status=${encodeURIComponent(status)}` : "";
    
    const response = await fetch(
      `${backendUrl}/schoolbase-admin/api/schools?page=${page}&limit=${limit}${statusQuery}`,
      {
        method: "GET",
        headers: {
          "Cookie": req.headers.get("cookie") || "",
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: error || "Failed to fetch schools" }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl = getBackendUrl();
    
    const response = await fetch(
      `${backendUrl}/schoolbase-admin/api/schools`,
      {
        method: "PATCH",
        headers: {
          "Cookie": req.headers.get("cookie") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error performing school action:", error);
    return NextResponse.json({ message: "Action failed" }, { status: 500 });
  }
}
