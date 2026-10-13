import { redirect } from "next/navigation";

export default function CompetitionAccountsRedirect() {
  redirect("/admin/competition");
}