"use client";

import { redirect } from "next/navigation";

export default function EditSubjectPage() {
  redirect("/admin/academics?view=subjects");
}
