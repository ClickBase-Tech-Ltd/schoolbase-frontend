import { redirect } from "next/navigation";

export default function AdminClassesPage() {
  redirect("/admin/academics?view=classes");
}
