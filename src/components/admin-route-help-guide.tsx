"use client";

import { usePathname } from "next/navigation";
import { UserGuide, type PageHelpGuide } from "@/components/ui/user-guide";

const pagesWithExistingGuide = new Set([
  "/admin/admissions",
  "/admin/classes",
  "/admin/fees",
  "/admin/fees/schedules",
  "/admin/id-cards",
  "/admin/promotions",
  "/admin/results",
  "/admin/results/new",
  "/admin/settings",
  "/admin/settings/result-pins",
  "/admin/settings/whatsapp",
  "/admin/students",
  "/admin/subjects",
  "/admin/subscribe",
  "/admin/subscription",
  "/admin/support",
  "/admin/teachers",
  "/admin/timetable",
  "/admin/website",
  "/admin/whatsapp",
]);

const pageGuides: Record<string, PageHelpGuide> = {
  "/admin/staff": {
    title: "Managing staff and access",
    overview: "Keep employee records and SchoolBase accounts accurate. The Staff directory lets you search employees, review employment status, add staff, and link eligible existing accounts.",
    steps: [
      "Use the Employees tab to find staff by name, staff number, job title, or email.",
      "Add a staff record for a new employee, or open an existing record to review its details.",
      "Use the Accounts tab to link an eligible SchoolBase account to the correct employee.",
      "Change employment status only when appropriate; suspended or former staff may lose SchoolBase access.",
    ],
    commonTasks: [
      {
        title: "Add a staff member",
        description: "Select Add staff and complete the employee profile fields requested by the form.",
      },
      {
        title: "Link an account",
        description: "Find the eligible account in the Accounts tab and link it to the matching employee record.",
        tips: ["Confirm the person and email address before linking access."],
      },
      {
        title: "Change employment status",
        description: "Choose the appropriate status and provide the requested reason. Review the access impact before confirming.",
      },
    ],
    faqs: [
      {
        question: "Why is an employee missing from the list?",
        answer: "Check the selected employment-status filter, classification filter, and search text. Clear filters to broaden the results.",
      },
      {
        question: "Can I link one account to the wrong employee?",
        answer: "Account links affect access and identity. Verify the employee details and email carefully before linking.",
      },
    ],
  },
  "/admin/staff/new": {
    title: "Registering a staff member",
    overview: "This form creates an employee profile and either creates a new SchoolBase account or links an existing unlinked school account. Complete the personal and employment details first, then carefully choose the account option. The account role controls system access; job title and employment classification describe the employee’s work and do not grant permissions.",
    steps: [
      "Enter the employee’s legal or preferred first and last names. Add a middle name if it is used in your school records.",
      "Add a phone number if available. A staff photo is optional and appears on the staff ID card; upload only a JPEG or PNG up to 4 MB.",
      "Open Emergency contact only when you have the employee’s consent and a valid operational need. This is restricted personal information; enter the contact name and phone accurately.",
      "Enter the job title and optional department. Choose Academic for teaching/academic work or Non-academic for other roles. Select the correct employment type and start date.",
      "Choose whether to create a new account or link an existing unlinked school account. Check the selected option and account details before continuing.",
      "For a new account, select Staff, Teacher, or Bursar as the account role, enter the employee’s login email, and set an initial password of at least 8 characters.",
      "For an existing account, search by name or email, select the exact account, and tick the confirmation that it belongs to this employee. Linking preserves that account’s current role, email, and password.",
      "If the account role is Teacher, review the available classes and subjects and select the assignments appropriate for this teacher. These options are not shown for other roles.",
      "Select Register staff member once. Wait for the save to finish; the staff number is assigned automatically, and the directory opens with a saved confirmation.",
    ],
    commonTasks: [
      {
        title: "Create a new staff account",
        description: "Use Create new account when the employee does not already have an eligible unlinked school account. The form creates the employee record and login account together.",
        tips: [
          "Use an email address the employee can access and that is not already assigned to another account.",
          "The initial password must be at least 8 characters. Share credentials securely and never include them in an ordinary email or public message.",
          "Choose the account role based on the access the person needs, not just their job title.",
        ],
      },
      {
        title: "Link an existing school account",
        description: "Use this option when the person already has an unlinked school login. Search for and select the matching account, then confirm that it belongs to this employee.",
        tips: [
          "Verify the person’s name and email before confirming; linking the wrong account can associate an employee record with the wrong identity.",
          "The existing account keeps its current role, email, and password.",
          "If the correct account is not listed, confirm it is unlinked and belongs to this school before trying again.",
        ],
      },
      {
        title: "Set up a Teacher account",
        description: "Select Teacher as the account role for a new account, or select an existing Teacher account. Then choose the classes and subjects the teacher should be assigned to.",
        tips: [
          "The account role determines system access; the Academic classification alone does not grant Teacher access.",
          "Assign only the classes and subjects the teacher is responsible for.",
        ],
      },
      {
        title: "Understand the staff number",
        description: "The staff number is generated automatically after the record is saved. You do not need to create or enter one.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between job title, classification, and account role?",
        answer: "Job title describes the employee’s position, such as Librarian. Classification groups the work as Academic or Non-academic. Account role—Staff, Teacher, or Bursar—controls the SchoolBase account permissions.",
      },
      {
        question: "Will linking an account reset its password or change its role?",
        answer: "No. Linking an existing account preserves its current role, email, and password. Confirm that the selected account belongs to the employee before linking it.",
      },
      {
        question: "Why are class and subject selections missing?",
        answer: "They are shown only when the selected account role is Teacher. Check the role or selected existing account.",
      },
      {
        question: "What photo files can I upload?",
        answer: "Staff photos are optional. The form accepts JPEG or PNG images up to 4 MB.",
      },
      {
        question: "What should I do if registration fails?",
        answer: "Read the error shown above the form, correct the indicated details, and try again. If it persists, contact SchoolBase support with the page name and error message; do not send passwords or emergency-contact details.",
      },
    ],
  },
  "/admin": {
    title: "School admin dashboard",
    overview: "Use the dashboard to review school setup, activity, and key operational summaries. The navigation menu opens each management area.",
    steps: [
      "Review setup prompts and dashboard summaries for items that need attention.",
      "Open a section from the navigation menu to manage its records.",
      "Use the page-level Help & Guide for instructions specific to a workflow.",
    ],
  },
  "/admin/attendance": {
    title: "Attendance management",
    overview: "Use the attendance area to review attendance tools and open student or staff attendance workflows.",
    steps: [
      "Choose the relevant student or staff attendance page.",
      "Select the date, class, or other filters available on that page.",
      "Review entries before saving or exporting attendance information.",
    ],
  },
  "/admin/analytics": {
    title: "School analytics",
    overview: "Use analytics pages to review performance summaries and identify records that may need follow-up.",
    steps: [
      "Choose the analytics report you need from the page navigation.",
      "Apply the available class, subject, or date filters.",
      "Use the results as a prompt for investigation; verify individual records in their source workflows.",
    ],
  },
  "/admin/activities": {
    title: "School activities",
    overview: "Review and manage the school activity information available in this section.",
    steps: [
      "Review the current activity list and its status.",
      "Use the available controls to create or update an activity.",
      "Confirm dates and audience details before saving or sharing.",
    ],
  },
  "/admin/academics": {
    title: "Academic setup",
    overview: "Use the academics area to review the academic structure and related setup available to your school.",
    steps: [
      "Review the academic settings and records shown on the page.",
      "Make changes using the available controls.",
      "Check the affected classes, terms, and subjects before saving.",
    ],
  },
  "/admin/competition": {
    title: "Competition",
    overview: "Review the competition tools available to your school and follow the instructions shown for each activity.",
    steps: [
      "Review available challenges or events.",
      "Check eligibility and instructions before participating.",
      "Contact SchoolBase support if a required action is unavailable.",
    ],
  },
  "/admin/financing": {
    title: "Tuition financing",
    overview: "Review the tuition-financing information and options available to your school.",
    steps: [
      "Read the product and eligibility information shown on the page.",
      "Review any terms and required information before proceeding.",
      "Contact the Platform Admin team if you need help with an application or status.",
    ],
  },
  "/admin/getting-started": {
    title: "Getting started",
    overview: "Complete the setup steps that help prepare your SchoolBase workspace for day-to-day use.",
    steps: [
      "Review each setup item and its completion status.",
      "Open an item to add or confirm the requested information.",
      "Return to the checklist and confirm that the progress has updated.",
    ],
  },
  "/admin/payments/webhooks": {
    title: "Payment webhook information",
    overview: "This page provides payment webhook information. If event logs or actions are not available, contact SchoolBase support for assistance.",
    steps: [
      "Review the page status and any instructions shown.",
      "Do not repeat a payment solely because a webhook status is unclear.",
      "Provide the transaction reference to support when requesting investigation.",
    ],
  },
  "/admin/staff-attendance": {
    title: "Staff attendance",
    overview: "Use the staff attendance area to review attendance capture and station tools available to your school.",
    steps: [
      "Choose the attendance or station workflow you need.",
      "Check staff identity, date, and station details before recording attendance.",
      "Review captured records and report discrepancies to a school administrator.",
    ],
  },
  "/admin/teacher-assignments": {
    title: "Teacher assignments",
    overview: "Review the teacher assignment options and availability shown on this page. If assignment controls are not yet available, contact SchoolBase support for guidance.",
    steps: [
      "Confirm the current page status and any rollout notice.",
      "Prepare the teacher, class, and subject details needed for assignments.",
      "Use the available assignment workflow when enabled; do not assume an assignment has been saved until it is confirmed.",
    ],
  },
};

function getPageLabel(pathname: string) {
  const segment = pathname.split("/").filter(Boolean).at(-1) || "dashboard";
  const labels: Record<string, string> = {
    new: "new record",
    all: "all records",
    students: "student attendance",
    stations: "attendance stations",
  };
  return labels[segment] || segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGuide(pathname: string): PageHelpGuide {
  const exactGuide = pageGuides[pathname];
  if (exactGuide) return exactGuide;

  const pageLabel = getPageLabel(pathname);
  return {
    title: `${pageLabel} guide`,
    overview: `Use this ${pageLabel.toLowerCase()} page to review and manage the information available to your school. Available actions, required fields, and status messages are shown on the page.`,
    steps: [
      "Review the page instructions and current records before making changes.",
      "Use the available search, filters, and actions to complete your task.",
      "Check the confirmation or status message to verify that your change was saved.",
      "If an action is unavailable or an error persists, contact SchoolBase support with the page name and a description of the issue.",
    ],
  };
}

export default function AdminRouteHelpGuide() {
  const pathname = usePathname();
  if (!pathname.startsWith("/admin") || pagesWithExistingGuide.has(pathname)) return null;

  return <UserGuide guide={getGuide(pathname)} />;
}
