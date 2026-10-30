import type { Metadata } from "next";
import {
  BookOpenCheck,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  Users,
  WalletCards,
} from "lucide-react";
import { PublicProductShell } from "@/components/public-product-shell";

const title = "Student Information System for Schools | SchoolBase";
const description =
  "Manage student records, admissions, classes, attendance, fees, academic results, and parent access through connected school management software.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://schoolbase.live/use-cases/data-management" },
  openGraph: {
    title,
    description,
    url: "https://schoolbase.live/use-cases/data-management",
    type: "website",
  },
};

const features = [
  {
    icon: Database,
    title: "Student and guardian records",
    description:
      "Keep student profiles and the guardian relationships used by school administration, parent access, and daily school workflows.",
  },
  {
    icon: FileText,
    title: "Admissions connected to records",
    description:
      "Collect applications through a school admissions page and continue approved applicant information into student and guardian records.",
  },
  {
    icon: GraduationCap,
    title: "Classes and academic history",
    description:
      "Organize students around the school’s classes, subjects, academic years, terms, assessments, and published results.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance records",
    description:
      "Record student attendance through school workflows and review the information alongside relevant student records.",
  },
  {
    icon: WalletCards,
    title: "Fees and payment history",
    description:
      "Connect student accounts to fee schedules, invoices, balances, recorded payments, and receipts.",
  },
  {
    icon: BookOpenCheck,
    title: "Reports for school teams and families",
    description:
      "Prepare report cards and academic reports, then make results available to parents after the school reviews and publishes them.",
  },
  {
    icon: Users,
    title: "Role-aware access",
    description:
      "Give administrators, teachers, and parents workflows suited to their role and the school records they need to use.",
  },
];

export default function DataManagementPage() {
  return (
    <PublicProductShell
      eyebrow="Student information system"
      title="Keep student records connected to the work of the whole school."
      description="SchoolBase brings student and guardian information together with admissions, classes, attendance, fees, academic results, and parent access. Instead of treating each school process as a separate record-keeping task, teams can work from connected student information."
      proofTitle="A connected student record"
      highlights={[
        "Student and guardian profiles",
        "Admissions and enrollment records",
        "Classes and academic history",
        "Attendance records",
        "Fees, invoices, and receipts",
        "Published results and parent access",
      ]}
      features={features}
      sectionTitle="Make student information useful from admission through each school term."
      ctaTitle="Give your school a clearer way to manage student records."
      relatedLinks={[
        { href: "/docs/admin", label: "School administration and student records" },
        { href: "/docs/admissions", label: "School admissions workflow" },
        { href: "/docs/academics", label: "Academic results and reporting" },
        { href: "/docs/fees", label: "Student fees, invoices, and payments" },
        { href: "/docs/teachers", label: "Teacher workflows and attendance" },
        { href: "/docs/parents", label: "Parent access to student information" },
        { href: "/nigeria-school-software", label: "School management system in Nigeria" },
        { href: "/ghana-school-software", label: "School management system in Ghana" },
      ]}
    />
  );
}
