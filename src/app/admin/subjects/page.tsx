"use client";

import { redirect } from "next/navigation";

export default function AdminSubjectsPage() {
  redirect("/admin/academics?view=subjects");
}
