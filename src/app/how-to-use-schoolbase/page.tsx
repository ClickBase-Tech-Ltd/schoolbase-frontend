import type { Metadata } from "next";
import GuideWizard from "./guide-wizard";

export const metadata: Metadata = {
  title: "SchoolBase Learning Centre | Guided Training by Role",
  description:
    "Step-by-step SchoolBase guides for administrators, teachers, bursars, parents, admissions teams, and school leaders.",
  alternates: { canonical: "https://schoolbase.live/how-to-use-schoolbase" },
  openGraph: {
    title: "SchoolBase Learning Centre | Guided Training by Role",
    description:
      "Choose your role and follow a practical, step-by-step guide through SchoolBase.",
    url: "https://schoolbase.live/how-to-use-schoolbase",
    type: "website",
  },
};

export default function HowToUseSchoolBasePage() {
  return <GuideWizard />;
}