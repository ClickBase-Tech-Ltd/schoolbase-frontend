"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Megaphone,
  School,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type RoleId = "administrator" | "teacher" | "staff" | "bursar" | "parent" | "admissions" | "leader";

type GuideStep = {
  title: string;
  section: string;
  summary: string;
  why: string;
  tasks: string[];
  href: string;
  action: string;
  guardrail?: string;
};

type GuideRole = {
  id: RoleId;
  name: string;
  shortName: string;
  descriptor: string;
  outcome: string;
  icon: LucideIcon;
  tint: string;
  guideHref: string;
  steps: GuideStep[];
};

const roles: GuideRole[] = [
  {
    id: "administrator",
    name: "School administrator",
    shortName: "Admin",
    descriptor: "Set up the school, control access, and keep the operating cycle moving.",
    outcome: "A connected school workspace with clear owners, accurate records, and controlled approvals.",
    icon: Settings2,
    tint: "mint",
    guideHref: "/docs/admin",
    steps: [
      { section: "Start here", title: "Establish the school workspace", summary: "Set the school identity and operating defaults before adding records that depend on them.", why: "A complete profile keeps school-facing documents, communications, and finance context consistent.", tasks: ["Review school name, address, contact details, country, and currency.", "Add the school logo and approved leadership details for official documents.", "Confirm payment instructions and communication settings with the appropriate school owner."], href: "/admin/settings", action: "Review school settings", guardrail: "Keep payment credentials private. Only authorized school leaders should manage settings." },
      { section: "Academic foundation", title: "Set the academic structure", summary: "Create the academic year, terms, phases, classes, and subjects that organize daily work.", why: "Teachers, assessments, fees, timetables, and reports all rely on a consistent academic structure.", tasks: ["Set the current academic year and its terms.", "Enable the phases used by your school.", "Create classes and subjects using the school's approved names and grouping."], href: "/admin/settings/academic-years", action: "Open academic setup", guardrail: "Confirm the current year and term before creating assessments or term fee schedules." },
      { section: "People and access", title: "Bring people into the right records", summary: "Maintain staff, student, and guardian records, then connect them to the correct school context.", why: "Accurate relationships determine which classes staff can manage and which children families can see.", tasks: ["Open Staff and add a Staff, Teacher, or Bursar account, or link an existing school account without changing its login or role.", "For each Teacher, assign the correct classes and subjects during registration or from the staff profile.", "Register or import students and check admission numbers for duplicates.", "Link guardians to the correct students and verify contact details through the school's process."], href: "/admin/staff", action: "Manage staff", guardrail: "Use each person's own account. Verify guardian relationships before sharing family access details." },
      { section: "Staff attendance", title: "Set up staff QR attendance", summary: "Configure the school's attendance policy and create a supervised station for eligible Staff and Teachers to scan.", why: "A clear schedule and supervised station help staff follow the same check-in process while keeping a reviewable attendance register.", tasks: ["Open Staff attendance and review the school timezone, workdays, shift start, grace period, checkout cutoff, and checkout requirement.", "Open Attendance stations, create a named station, and display its rotating QR at a supervised check-in point.", "Ask each eligible Staff member and Teacher to use their own active account and scan from Check in / out; remind them to wait for confirmation and scan again later to check out when required.", "Review the staff register and make corrections through the administrator workflow with a reason."], href: "/admin/staff-attendance", action: "Set up staff attendance", guardrail: "Staff QR scanning requires internet, HTTPS, and camera access; offline scans are not queued. Bursars are not currently eligible for QR scanning. A QR scan does not prove physical presence; supervise the station and keep a manual fallback." },
      { section: "Admissions", title: "Review admissions deliberately", summary: "Control the public application window, review submissions, and move approved applicants into school records.", why: "The admission decision and the student record are separate steps; a complete handoff avoids orphaned or duplicate records.", tasks: ["Check admissions availability, dates, classes, and the school-specific application link.", "Review applications and request corrections through the school's approved channel.", "Approve eligible applications and verify the resulting pupil and guardian records."], href: "/admin/admissions", action: "Open admissions", guardrail: "Collect only information required by the school's admission process and limit record access to authorized staff." },
      { section: "Finance setup", title: "Configure fees before issuing invoices", summary: "Define fee schedules and line items, then review the invoice process before families are asked to pay.", why: "Clear itemization helps families understand charges and gives the bursary team records it can reconcile.", tasks: ["Create fee schedules for the intended academic year, term, class, or pupil group.", "Separate charges into the school's real fee items and verify amounts and due dates.", "Preview invoice totals and payment instructions before issuing invoices."], href: "/admin/fees", action: "Open fees", guardrail: "Do not issue test invoices or change balances in a live school account during practice." },
      { section: "Teaching operations", title: "Prepare teacher workflows", summary: "Make sure class/subject assignments and timetable information are in place before teachers begin routine entry.", why: "Teacher access is assignment-based; incorrect assignments create missing work or inappropriate access.", tasks: ["Review teacher-to-class and teacher-to-subject assignments.", "Publish the timetable the school intends staff and families to use.", "Agree who records attendance, enters assessment scores, and handles corrections."], href: "/admin/teacher-assignments", action: "Review assignments", guardrail: "Resolve access through the school administrator; do not work around missing permissions with shared accounts." },
      { section: "Academics and results", title: "Set the assessment review path", summary: "Create assessments, configure components, receive teacher entries, and manage the school's approval and publication steps.", why: "Parents see results only after the school completes its review and publishes them.", tasks: ["Create the assessment for the correct year, term, phase, classes, and subjects.", "Set the approved score components and confirm the entry deadline with teachers.", "Review completeness and validation, approve/lock as appropriate, then publish when authorized."], href: "/admin/results", action: "Open results", guardrail: "Do not treat teacher score entry as approval. Verify the selected assessment and audience before publishing." },
      { section: "Communication and oversight", title: "Close the loop with families and leadership", summary: "Use school announcements, communication channels, and reports to keep the community informed and monitor follow-through.", why: "Connected records are most useful when the right people receive timely, accurate updates.", tasks: ["Publish school announcements only after review and audience selection.", "Check communication settings and delivery status for enabled channels.", "Review attendance, academic, fee, and operational reports on an agreed cadence."], href: "/admin/analytics", action: "Review school reports", guardrail: "Use approved channels for sensitive matters; never put student credentials or private records in a general announcement." },
    ],
  },
  {
    id: "teacher",
    name: "Teacher",
    shortName: "Teacher",
    descriptor: "Work confidently with assigned classes, attendance, assessments, and student support.",
    outcome: "Accurate classroom records and a clean handoff to school review and parent communication.",
    icon: GraduationCap,
    tint: "blue",
    guideHref: "/docs/teachers",
    steps: [
      { section: "Get oriented", title: "Check your teaching workspace", summary: "Start from the teacher dashboard and confirm your classes, subjects, timetable, and current school context.", why: "Your account should reflect only the classes and subjects the school assigned to you.", tasks: ["Sign in with your own staff account.", "Review your dashboard, assigned classes, assigned subjects, and timetable.", "Ask the school administrator to correct missing or incorrect assignments before entering records."], href: "/teacher", action: "Open teacher dashboard", guardrail: "Never use a colleague's login to get around an access issue." },
      { section: "Staff profile", title: "Maintain your staff profile", summary: "Update your personal details and photo from your profile while keeping your school account identity and teaching assignments clear.", why: "A complete employee profile helps the school maintain accurate staff records without giving up account and access controls.", tasks: ["Open Profile from your Teacher workspace.", "Review or update your name and phone number, and optionally upload a JPEG or PNG photo up to 4 MB.", "If your employee profile has not been completed yet, enter your personal details and save to create it.", "Ask your school administrator to change your role, access, or class and subject assignments."], href: "/teacher/profile", action: "Open your profile", guardrail: "Your profile page does not change your login email, role, or access permissions." },
      { section: "Staff attendance", title: "Check in and out at your school", summary: "Use your own active Teacher account to scan the rotating code shown at your school's supervised attendance station.", why: "Each accepted scan is tied to your signed-in account and recorded by the school for attendance review.", tasks: ["Open Check in / out from your staff workspace while connected to the internet.", "Allow camera access, point the camera at the station's current rotating QR code, and wait for the confirmation.", "Scan again later to record checkout if your school requires checkout.", "If the camera, device, or connection is unavailable, notify your administrator and use the school's supervised manual process."], href: "/staff/attendance", action: "Open check in / out", guardrail: "Do not scan for another person or share your account. A QR scan cannot prove physical presence; the school supervises the station. Offline scans are not queued." },
      { section: "Class context", title: "Find the right class and student list", summary: "Open your class workspace and verify the roster before taking attendance or entering scores.", why: "A correct class context prevents records being attached to the wrong group.", tasks: ["Open My Class or the class list for your assigned group.", "Check the class name and pupil roster against the school's current register.", "Use the timetable to confirm the lesson and subject context."], href: "/teacher/class", action: "Open My Class" },
      { section: "Daily routine", title: "Record attendance safely", summary: "Choose the intended class and date, review every pupil, then save and confirm synchronization.", why: "Attendance is a live school record, and an unnoticed default can produce an inaccurate register.", tasks: ["Open Attendance and select the correct class and date.", "Review each pupil. New entries start as Present; change anyone absent, late, or excused.", "Save the register and confirm the success state. If sync is pending, retry and verify before leaving."], href: "/teacher/attendance", action: "Open attendance", guardrail: "Never save a practice register against a real class/date. If a register already exists, ask the school administrator rather than bypassing it." },
      { section: "Teaching plan", title: "Use the published timetable", summary: "Use the timetable to orient your day and check the class, subject, room, and period details available to you.", why: "A shared timetable reduces conflicting schedules and helps families and staff work from the same plan.", tasks: ["Open your timetable and confirm the selected day/week.", "Check the class and subject before opening a lesson.", "Report schedule conflicts to the timetable owner."], href: "/teacher/timetable", action: "Open timetable" },
      { section: "Assessment workflow", title: "Enter assessment scores", summary: "Choose the correct assessment and assigned subject, enter verified work, and follow the school's review handoff.", why: "Teacher entry contributes to results, but school administrators control formal approval and publication.", tasks: ["Open Results and identify the correct assessment, term, class, and subject.", "Enter scores only for work you have checked and within the configured components.", "Review completeness and report corrections through the school's results process."], href: "/teacher/results", action: "Open teacher results", guardrail: "Do not enter sample scores into a live assessment or promise parents that draft entries are final results." },
      { section: "Student support", title: "Add useful context and communicate", summary: "Use comments, observations, daily reports, and approved communication features where enabled for your role.", why: "Consistent, factual context helps the school support students and communicate with families appropriately.", tasks: ["Record comments or observations that are relevant, factual, and appropriate for the intended audience.", "Use daily reports or announcements only where the school has enabled the workflow.", "Review student information privately and sign out on shared devices."], href: "/teacher/observations", action: "Open teacher tools", guardrail: "Keep sensitive student information within authorized school channels." },
    ],
  },
  {
    id: "staff",
    name: "Staff member",
    shortName: "Staff",
    descriptor: "Keep your staff profile current and use your own account for scheduled attendance check-in.",
    outcome: "An up-to-date personal profile and attendance records submitted through the school's supervised process.",
    icon: Users,
    tint: "mint",
    guideHref: "/docs/admin",
    steps: [
      { section: "Staff profile", title: "Complete or update your profile", summary: "Use your staff workspace to keep your personal details and photo current.", why: "A complete employee profile connects your active school account to the staff records used by your school.", tasks: ["Sign in with your own active school account and open My staff profile.", "Enter or review your first name, last name, and phone number.", "Optionally add a JPEG or PNG photo up to 4 MB, then save your details.", "Contact your school administrator for changes to your role, account access, employment details, or profile corrections you cannot make yourself."], href: "/employee/profile", action: "Open your staff profile", guardrail: "Profile self-service does not change your login email, password, role, or access permissions." },
      { section: "Staff attendance", title: "Check in and out", summary: "If your school has enabled QR attendance, scan the current code at its supervised station using your own account.", why: "The school register records accepted check-in and checkout times for eligible active Staff accounts.", tasks: ["Open Check in / out while signed in and connected to the internet.", "Allow camera access, scan the rotating station QR, and wait for the on-screen confirmation.", "Scan again later if checkout is required by your school's attendance policy.", "If scanning is unavailable, tell your administrator and follow the supervised manual attendance process."], href: "/staff/attendance", action: "Open check in / out", guardrail: "QR scanning is currently for active Staff and Teacher accounts only. Do not scan for another person. Offline scans are not queued, and a scan cannot prove physical presence." },
    ],
  },
  {
    id: "bursar",
    name: "Bursar / finance team",
    shortName: "Bursar",
    descriptor: "Manage school charges, collections, payment records, and finance visibility.",
    outcome: "Clear invoices, correctly recorded payments, and explainable finance reports.",
    icon: WalletCards,
    tint: "amber",
    guideHref: "/docs/accounting",
    steps: [
      { section: "Set up", title: "Confirm finance context", summary: "Check the academic period, currency, school payment instructions, and your authorized access before making finance changes.", why: "Finance records must use the right school and period and match the school's approved policy.", tasks: ["Confirm the school currency and current academic year/term.", "Review the payment methods and instructions approved by school leadership.", "Check that your account has the appropriate bursary permissions."], href: "/admin/fees", action: "Review fee workspace", guardrail: "Never expose bank details, payment credentials, or another family's account information during training." },
      { section: "Staff profile", title: "Review your personal profile", summary: "Bursars can use the shared profile page for employee details and account settings.", why: "Keeping personal staff details current supports accurate school records while preserving administrator control of role and access.", tasks: ["Open Profile from your Bursar workspace.", "Review or update your name and phone number, and optionally upload a JPEG or PNG photo up to 4 MB.", "Ask your school administrator to change your role, account access, or employment details."], href: "/accounting/profile", action: "Open your profile", guardrail: "Bursar accounts are not currently supported by the QR attendance scanner. Follow your school's supervised manual attendance process." },
      { section: "Fee schedules", title: "Build understandable fee schedules", summary: "Create the schedule and itemized charges the school has approved for a class, term, or student context.", why: "Itemization makes amounts understandable to families and simplifies later review.", tasks: ["Choose the intended year, term, class, or student scope.", "Add distinct fee items using approved names, amounts, and due dates.", "Review exemptions, adjustments, and totals before generating invoices."], href: "/admin/fees/schedules", action: "Open fee schedules" },
      { section: "Billing", title: "Issue and monitor invoices", summary: "Generate invoices only after verifying the students, schedule, and due dates.", why: "An issued invoice becomes a parent-facing financial record.", tasks: ["Preview the invoice list and verify the intended students and fee items.", "Issue invoices through the school's approved process.", "Monitor outstanding and paid balances and follow up using approved channels."], href: "/admin/fees", action: "Open invoices", guardrail: "Do not issue sample invoices to real pupils as a training exercise." },
      { section: "Collections", title: "Record payments and provide receipts", summary: "Record the payment against the correct student/invoice and confirm the resulting balance and receipt.", why: "Correct allocation prevents a family balance from appearing unpaid after a payment is received.", tasks: ["Verify the payer, pupil, amount, date, and payment method against the school's evidence.", "Apply the payment to the intended invoice or items.", "Confirm the receipt and remaining balance, then follow the school's correction process if something is wrong."], href: "/accounting/fees", action: "Open payment records", guardrail: "Never mark a payment received without the school's required confirmation or evidence." },
      { section: "Accounting and reconciliation", title: "Review the wider finance picture", summary: "Use accounting tools to record and review income and expenses alongside fee collection records.", why: "Invoices and accounting transactions are related but distinct records; reconciliation requires both to be correct.", tasks: ["Record income and expenses using the approved categories.", "Follow approval/posting rules for expenses and retain supporting references.", "Review cashbook activity and reports; correct entries using the supported reversal or adjustment process."], href: "/accounting", action: "Open accounting", guardrail: "Do not silently overwrite posted transactions; follow the audited correction workflow." },
    ],
  },
  {
    id: "parent",
    name: "Parent / guardian",
    shortName: "Parent",
    descriptor: "Find the records the school has shared for your linked child or children.",
    outcome: "Confident, private access to school updates, attendance, results, and fee information.",
    icon: Users,
    tint: "coral",
    guideHref: "/docs/parents",
    steps: [
      { section: "Sign in", title: "Open your family portal", summary: "Use the school’s official parent sign-in route and the contact details recorded by the school.", why: "The portal connects your session to verified guardian and pupil relationships.", tasks: ["Open Parent sign in at /parent/login.", "Enter the phone number recorded with the school. A linked child's admission number is optional but can verify the child connection.", "Enter the school slug if the phone is registered with more than one school or the school asks you to use it."], href: "/parent/login", action: "Open parent sign in", guardrail: "Never post phone numbers, admission numbers, passwords, or child records in a public/group chat. The school should help privately if sign-in fails." },
      { section: "Family records", title: "Select the right child", summary: "If more than one child is linked, choose the child whose information you need before opening records.", why: "Checking the selected child prevents confusion between siblings or similarly named pupils.", tasks: ["Open Children to review the profiles connected to your account.", "Check the child's name and class before continuing.", "Ask the school office privately if a child is missing or incorrectly connected."], href: "/parent/children", action: "View linked children" },
      { section: "School day", title: "Review attendance and timetable", summary: "Use the attendance history and any published timetable available for your child.", why: "Current school records help families stay aligned with attendance and daily plans.", tasks: ["Open your child's attendance information and check the dates shown.", "Open the timetable if the school has published one.", "Contact the school through its normal channel about a record that appears incorrect."], href: "/parent/timetable", action: "Open parent timetable" },
      { section: "Academic progress", title: "Read published results and reports", summary: "Find assessments after the school has completed its review and publication process.", why: "The Parent Portal is for released school information, not draft teacher entries.", tasks: ["Open Results and select the relevant child or assessment.", "Review the published result or report card and note the term/assessment context.", "Ask the school about a missing result; it may not yet have been published."], href: "/parent/results", action: "Open parent results", guardrail: "Draft marks are not visible results. Do not use another family member's account to access records." },
      { section: "Fees and updates", title: "Review invoices, payments, and school news", summary: "Use the portal to check issued invoices, payment history, publications, and school information.", why: "A shared view helps families understand charges and find the school's latest notices.", tasks: ["Review an invoice and the payment instructions shown by the school.", "Check payment history and keep payment receipts or confirmations.", "Read school publications and contact the office privately about a discrepancy."], href: "/parent/invoices", action: "Open parent invoices", guardrail: "Follow only the school's approved payment instructions. Sign out on shared devices." },
    ],
  },
  {
    id: "admissions",
    name: "Admissions / front office",
    shortName: "Admissions",
    descriptor: "Receive applications, maintain trusted records, and give families a clear path into the school.",
    outcome: "A reviewed admission becomes a complete student-family record with a clean operational handoff.",
    icon: ClipboardCheck,
    tint: "violet",
    guideHref: "/docs/admissions",
    steps: [
      { section: "Prepare", title: "Configure the admissions window", summary: "Confirm availability, dates, classes, and the school's public application details before directing families to apply.", why: "Clear application settings prevent families submitting to an unavailable or incorrect intake.", tasks: ["Review admissions availability and the intended application dates.", "Confirm class options and school contact information.", "Copy and test the school-specific admissions link."], href: "/admin/admissions", action: "Open admissions settings" },
      { section: "Review", title: "Assess incoming applications", summary: "Review each application, track its status, and request missing information through approved channels.", why: "A clear review process protects data quality and makes decisions traceable.", tasks: ["Open the admissions queue and confirm applicant identity and selected class.", "Review required student, guardian, and supporting information.", "Update status and communicate next steps using the school's approved process."], href: "/admin/admissions", action: "Review applications", guardrail: "Do not share application or health details beyond authorized staff." },
      { section: "Create records", title: "Convert approved applications carefully", summary: "Move an approved applicant into school records and verify the resulting student and guardian relationship.", why: "The resulting pupil record is used by classes, attendance, fees, results, and parent access.", tasks: ["Confirm the application is approved before conversion.", "Search existing records to avoid duplicate student profiles.", "Verify the generated admission number, class placement, guardian, and contact data."], href: "/admin/students", action: "Open student records" },
      { section: "Handoff", title: "Prepare class and family access", summary: "Coordinate the record handoff to the school administrator and communicate parent access privately.", why: "Families can only use the portal when contact details and guardian links match the school's records.", tasks: ["Confirm the student is active and assigned to the correct class.", "Confirm guardian relationship and recorded phone number.", "Send parent access instructions through the school's approved private channel."], href: "/docs/parents", action: "Read parent access guide", guardrail: "Never send admission numbers or student details to a group chat." },
      { section: "Service", title: "Handle family questions consistently", summary: "Route questions about records, applications, and access to the right school owner.", why: "A clear escalation path keeps staff from making changes outside their role.", tasks: ["Identify who owns admissions decisions, student records, and parent account corrections.", "Record the issue without copying unnecessary personal information into general notes.", "Confirm the resolution with the family using an approved channel."], href: "/admin/support", action: "Open support" },
    ],
  },
  {
    id: "leader",
    name: "School leader",
    shortName: "Leader",
    descriptor: "Set school-wide operating expectations and use connected information to guide decisions.",
    outcome: "A measured, well-governed school operation with clear owners for every key workflow.",
    icon: School,
    tint: "teal",
    guideHref: "/docs/reports",
    steps: [
      { section: "Governance", title: "Confirm ownership and access", summary: "Make sure each system workflow has an accountable school owner and role-appropriate access.", why: "Clear ownership improves data quality while keeping sensitive records appropriately restricted.", tasks: ["Name the owners for school settings, admissions, records, attendance, results, fees, and communications.", "Review staff roles and class/subject assignments with the administrator.", "Agree how access, corrections, and urgent issues are escalated."], href: "/admin/staff", action: "Review school team", guardrail: "Avoid shared logins and broad access that is not required for the person's role." },
      { section: "Daily operations", title: "Establish the daily operating rhythm", summary: "Set expectations for student and staff attendance, timetable updates, student record corrections, and family communications.", why: "Predictable routines prevent missing registers and conflicting information.", tasks: ["Agree when student attendance is recorded and who follows up on exceptions.", "Set up staff attendance policy and supervised QR stations; define a manual fallback for device or network issues.", "Set a timetable publication and change-notification process.", "Review how the school handles parent questions and record corrections."], href: "/admin/staff-attendance", action: "Review staff attendance" },
      { section: "Academic cycle", title: "Govern assessment and result release", summary: "Define the process from assessment setup through teacher score entry, validation, approval, and parent publication.", why: "A documented review and release sequence reduces errors and prevents premature disclosure.", tasks: ["Agree who creates assessments and sets score components.", "Set a teacher entry deadline and a review/validation owner.", "Authorize publication only after the required checks are complete."], href: "/admin/results", action: "Review results", guardrail: "Published results are parent-visible; verify data and audience before release." },
      { section: "Financial stewardship", title: "Review fees and finance controls", summary: "Keep fee decisions, payment confirmation, accounting review, and reconciliation under clear ownership.", why: "The school needs accurate balances as well as accountable financial records.", tasks: ["Confirm approved schedules, due dates, and payment instructions.", "Review how receipts and manual payment evidence are checked.", "Set a cadence for cashbook, income/expense, and outstanding balance review."], href: "/accounting/reports", action: "Open finance reports", guardrail: "Use the school's audited correction process for posted transactions." },
      { section: "Insight", title: "Use reports to act, not just observe", summary: "Review academic, attendance, finance, and operational information with the people who can respond.", why: "A useful metric has a named owner, a next action, and a follow-up date.", tasks: ["Choose the reports relevant to the school's current priorities.", "Discuss trends with staff who understand the underlying records.", "Assign an action and check progress in the next review."], href: "/admin/analytics", action: "Open analytics" },
      { section: "Community", title: "Keep family communication deliberate", summary: "Set who can publish announcements, which audiences receive them, and how families get portal access.", why: "Consistent communication builds confidence without exposing private student details.", tasks: ["Review announcement ownership and approval rules.", "Confirm parent portal access instructions and a private help contact.", "Ask for feedback after families and staff have used the first workflows."], href: "/admin/website", action: "Manage school communications", guardrail: "Use private school channels for personal student or payment matters." },
    ],
  },
];

const systemModules = [
  { title: "School setup and people", description: "Profile, academic years, terms, classes, subjects, staff, student records, and permissions.", href: "/docs/admin", icon: Settings2, tint: "mint" },
  { title: "Admissions", description: "Application windows, application review, decisions, and student record handoff.", href: "/docs/admissions", icon: ClipboardCheck, tint: "violet" },
  { title: "Teaching", description: "Assigned classes and subjects, attendance, timetable, observations, results, and classroom workflows.", href: "/docs/teachers", icon: GraduationCap, tint: "blue" },
  { title: "Academics and results", description: "Assessments, score entry, validation, approval, publication, and academic reports.", href: "/docs/academics", icon: BookOpen, tint: "teal" },
  { title: "Fees and payments", description: "Itemized fee schedules, invoices, balances, payment records, and receipts.", href: "/docs/fees", icon: WalletCards, tint: "amber" },
  { title: "Accounting", description: "Income, expenses, approvals, cashbook activity, and financial reporting.", href: "/docs/accounting", icon: Landmark, tint: "coral" },
  { title: "Parent portal", description: "Linked children, attendance, published results, invoices, payments, and publications.", href: "/docs/parents", icon: Users, tint: "blue" },
  { title: "Communication", description: "Announcements and available school email and WhatsApp workflows.", href: "/docs/communication", icon: Megaphone, tint: "violet" },
  { title: "Reports and analytics", description: "Academic, attendance, class, subject, and finance views for authorized roles.", href: "/docs/reports", icon: BarChart3, tint: "teal" },
  { title: "Timetables", description: "Build and publish schedules for staff and families.", href: "/admin/timetable", icon: CalendarDays, tint: "amber" },
  { title: "Promotions", description: "Preview and apply approved student progression decisions.", href: "/admin/promotions", icon: ArrowRight, tint: "coral" },
  { title: "Help and support", description: "Find guides, frequently asked questions, and the school's support route.", href: "/faq", icon: CircleHelp, tint: "mint" },
];

const progressKey = "schoolbase-learning-wizard-v1";

type SavedProgress = {
  roleId?: RoleId;
  stepIndex?: number;
  completed?: Record<string, boolean>;
  checked?: Record<string, string[]>;
};

function progressId(roleId: RoleId, index: number) {
  return `${roleId}:${index}`;
}

export default function GuideWizard() {
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, string[]>>({});
  const [ready, setReady] = useState(false);
  const [moduleSearch, setModuleSearch] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(progressKey);
        if (stored) {
          const parsed = JSON.parse(stored) as SavedProgress;
          if (parsed.roleId && roles.some((item) => item.id === parsed.roleId)) setSelectedRole(parsed.roleId);
          if (typeof parsed.stepIndex === "number") setActiveStep(parsed.stepIndex);
          if (parsed.completed) setCompleted(parsed.completed);
          if (parsed.checked) setChecked(parsed.checked);
        }
      } catch {
        window.localStorage.removeItem(progressKey);
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(progressKey, JSON.stringify({ roleId: selectedRole, stepIndex: activeStep, completed, checked }));
    } catch {
      // The guide remains usable when browser storage is unavailable.
    }
  }, [activeStep, checked, completed, ready, selectedRole]);

  const role = roles.find((item) => item.id === selectedRole) ?? null;
  const RoleIcon = role?.icon;
  const step = role?.steps[Math.min(activeStep, (role?.steps.length ?? 1) - 1)] ?? null;
  const stepKey = role ? progressId(role.id, activeStep) : "";
  const roleDone = role ? role.steps.filter((_, index) => completed[progressId(role.id, index)]).length : 0;
  const rolePercent = role ? Math.round((roleDone / role.steps.length) * 100) : 0;
  const filteredModules = systemModules.filter((module) => `${module.title} ${module.description}`.toLowerCase().includes(moduleSearch.toLowerCase()));

  function chooseRole(roleId: RoleId) {
    setSelectedRole(roleId);
    setActiveStep(0);
  }

  function setTaskDone(task: string, isDone: boolean) {
    if (!role) return;
    setChecked((current) => {
      const currentTasks = current[stepKey] ?? [];
      const nextTasks = isDone ? [...new Set([...currentTasks, task])] : currentTasks.filter((item) => item !== task);
      return { ...current, [stepKey]: nextTasks };
    });
  }

  function toggleStepComplete() {
    if (!role) return;
    setCompleted((current) => ({ ...current, [stepKey]: !current[stepKey] }));
  }

  function resetProgress() {
    setCompleted({});
    setChecked({});
    setActiveStep(0);
    try {
      window.localStorage.removeItem(progressKey);
    } catch {
      // Resetting the in-memory guide is sufficient if storage is unavailable.
    }
  }

  return (
    <main className="learning-centre min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pt-14">
          <div className="mb-7 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand"><Sparkles className="h-4 w-4" /> Practical product learning</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Your SchoolBase, step by step.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">Choose your role to get a guided route through the parts of the system you use. Your checklist stays on this device, so you can pause and pick it up later.</p>
            </div>
            {role ? <div className="flex items-center gap-3 border-l-2 border-brand pl-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Your learning path</p><p className="mt-1 text-sm font-semibold">{roleDone} of {role.steps.length} lessons complete</p></div><div className="h-10 w-10" role="img" aria-label={`${rolePercent}% complete`}><svg viewBox="0 0 40 40" className="h-full w-full -rotate-90"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" strokeWidth="4" /><circle cx="20" cy="20" r="16" fill="none" stroke="var(--brand)" strokeWidth="4" strokeDasharray={`${rolePercent} 100`} pathLength="100" strokeLinecap="round" /></svg></div></div> : null}
          </div>

          {!role ? (
            <section aria-labelledby="role-heading" className="animate-guide-in">
              <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Choose your perspective</p><h2 id="role-heading" className="mt-1 text-lg font-semibold">What best describes your role?</h2></div><span className="hidden text-xs text-muted sm:block">7 guided pathways</span></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((item, index) => {
                  const Icon = item.icon;
                  return <button key={item.id} type="button" onClick={() => chooseRole(item.id)} className={`role-tile role-${item.tint} group animate-tile-in border border-border bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand/30`} style={{ animationDelay: `${index * 55}ms` }}><span className="flex items-start justify-between"><span className="role-icon flex h-11 w-11 items-center justify-center"><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" /></span><span className="mt-5 block text-base font-semibold">{item.name}</span><span className="mt-2 block min-h-10 text-sm leading-5 text-muted">{item.descriptor}</span><span className="mt-5 flex items-center gap-2 border-t border-border pt-3 text-xs font-bold text-brand">Start this path <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></button>;
                })}
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />These are role-based learning guides. Your actual access still depends on your school account and permissions.</p>
            </section>
          ) : null}

          {role && step ? (
            <section className="animate-guide-in" aria-label={`${role.name} learning path`}>
              <div className="mb-4 flex flex-col justify-between gap-3 border-y border-border py-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Choose a role">
                  {roles.map((item) => <button key={item.id} type="button" onClick={() => chooseRole(item.id)} aria-pressed={item.id === role.id} className={`shrink-0 border px-3 py-2 text-xs font-semibold transition ${item.id === role.id ? "border-brand bg-brand text-white" : "border-transparent text-muted hover:border-border hover:bg-white"}`}>{item.shortName}</button>)}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted"><span>{activeStep + 1} / {role.steps.length}</span><button type="button" onClick={resetProgress} className="inline-flex items-center gap-1.5 border-l border-border pl-3 font-medium transition hover:text-brand">Reset path</button></div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)] xl:gap-8">
                <aside className="hidden lg:block">
                  <div className="sticky top-6">
                    <div className="mb-4 border-b border-border pb-4"><div className="flex items-center gap-3"><span className={`role-icon role-${role.tint} flex h-10 w-10 items-center justify-center`}>{RoleIcon ? <RoleIcon className="h-5 w-5" /> : null}</span><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Learning path</p><p className="mt-1 text-sm font-semibold">{role.name}</p></div></div><p className="mt-4 text-xs leading-5 text-muted">{role.outcome}</p></div>
                    <nav aria-label="Lessons" className="space-y-1">
                      {role.steps.map((item, index) => {
                        const isActive = index === activeStep;
                        const isDone = completed[progressId(role.id, index)];
                        return <button key={item.title} type="button" onClick={() => setActiveStep(index)} aria-current={isActive ? "step" : undefined} className={`group flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition ${isActive ? "border-brand bg-white" : "border-transparent hover:bg-white/70"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center text-[11px] font-bold ${isDone ? "bg-success text-white" : isActive ? "bg-brand-light text-brand" : "bg-background text-muted"}`}>{isDone ? <Check className="h-3.5 w-3.5" /> : String(index + 1).padStart(2, "0")}</span><span className={`min-w-0 flex-1 truncate text-xs ${isActive ? "font-bold text-foreground" : "font-medium text-muted"}`}>{item.section}</span><ChevronRight className={`h-3.5 w-3.5 ${isActive ? "text-brand" : "text-transparent group-hover:text-muted"}`} /></button>;
                      })}
                    </nav>
                    <div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-muted"><span>Path progress</span><span>{rolePercent}%</span></div><div className="mt-2 h-1.5 overflow-hidden bg-border"><div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${rolePercent}%` }} /></div></div>
                    <Link href={role.guideHref} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-brand hover:underline">Open written role guide <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                  </div>
                </aside>

                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Jump to lesson">{role.steps.map((item, index) => <button key={item.title} type="button" onClick={() => setActiveStep(index)} aria-label={`Go to lesson ${index + 1}: ${item.title}`} aria-current={index === activeStep ? "step" : undefined} className={`flex h-9 w-9 shrink-0 items-center justify-center border text-xs font-bold ${index === activeStep ? "border-brand bg-brand text-white" : completed[progressId(role.id, index)] ? "border-success bg-success text-white" : "border-border bg-white text-muted"}`}>{completed[progressId(role.id, index)] ? <Check className="h-4 w-4" /> : index + 1}</button>)}</div>

                  <article key={step.title} className="guide-step-enter border border-border bg-white shadow-lg">
                    <div className="grid xl:grid-cols-[minmax(0,1fr)_230px]">
                      <div className="min-w-0 p-5 sm:p-8 xl:p-10">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-brand"><span>{step.section}</span><span className="text-muted">/</span><span>Lesson {String(activeStep + 1).padStart(2, "0")}</span></div>
                        <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{step.title}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{step.summary}</p>

                        <div className="mt-7 border-l-2 border-[#dba84b] bg-[#fff9ed] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#886123]">Why this matters</p><p className="mt-1.5 text-sm leading-6 text-[#66583e]">{step.why}</p></div>

                        <div className="mt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Work through this lesson</p><h3 className="mt-1 text-base font-semibold">Your checklist</h3></div><span className="text-[11px] text-muted">Saved on this device</span></div><div className="mt-3 divide-y divide-border border-y border-border">{step.tasks.map((task) => { const isChecked = checked[stepKey]?.includes(task) ?? false; return <button key={task} type="button" aria-pressed={isChecked} onClick={() => setTaskDone(task, !isChecked)} className="flex w-full items-start gap-3 py-3.5 text-left transition hover:bg-[#f6faff]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition ${isChecked ? "border-brand bg-brand text-white" : "border-border bg-white text-transparent"}`}><Check className="h-3.5 w-3.5" /></span><span className={`text-sm leading-6 ${isChecked ? "text-muted line-through" : "text-foreground"}`}>{task}</span></button>; })}</div></div>

                        {step.guardrail ? <div className="mt-5 flex items-start gap-2.5 border border-[#f0d8d5] bg-[#fff7f6] px-3.5 py-3 text-xs leading-5 text-[#814b45]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b05d52]" /><span><strong className="font-semibold">Keep in mind:</strong> {step.guardrail}</span></div> : null}

                        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"><Link href={step.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/40">{step.action}<ArrowUpRight className="h-4 w-4" /></Link><button type="button" onClick={toggleStepComplete} aria-pressed={Boolean(completed[stepKey])} className={`inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 text-sm font-semibold transition ${completed[stepKey] ? "border-success/30 bg-[#f1f7f4] text-success" : "border-border bg-white text-foreground hover:border-brand/50"}`}>{completed[stepKey] ? <><CheckCircle2 className="h-4 w-4" /> Lesson complete</> : <><Check className="h-4 w-4" /> Mark lesson complete</>}</button></div>
                      </div>

                      <aside className="border-t border-border bg-[#f6faff] p-5 sm:p-6 xl:border-l xl:border-t-0"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted"><LayoutDashboard className="h-3.5 w-3.5" /> At a glance</div><div className="mt-5"><p className="text-3xl font-semibold tracking-tight text-foreground">{String(activeStep + 1).padStart(2, "0")}<span className="text-base font-medium text-muted"> / {String(role.steps.length).padStart(2, "0")}</span></p><p className="mt-1 text-xs text-muted">lessons in this role path</p></div><div className="mt-5 h-px bg-border" /><div className="mt-5"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">Your role outcome</p><p className="mt-2 text-sm leading-6 text-muted">{role.outcome}</p></div><div className="mt-5 border border-border bg-white p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-foreground"><BookOpen className="h-4 w-4 text-brand" /> Reference guide</div><p className="mt-1.5 text-xs leading-5 text-muted">Keep the detailed role documentation close while you practise.</p><Link href={role.guideHref} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline">Open {role.shortName} guide <ArrowRight className="h-3.5 w-3.5" /></Link></div><div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />Checklist progress is saved only in this browser on this device.</div></aside>
                    </div>
                    <footer className="flex items-center justify-between gap-3 border-t border-border bg-[#f6faff] px-5 py-4 sm:px-8"><button type="button" onClick={() => setActiveStep((index) => Math.max(0, index - 1))} disabled={activeStep === 0} className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-muted transition hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button><span className="hidden text-xs text-muted sm:block">{step.section}</span><button type="button" onClick={() => setActiveStep((index) => Math.min(role.steps.length - 1, index + 1))} disabled={activeStep === role.steps.length - 1} className="inline-flex min-h-10 items-center gap-2 px-2 text-sm font-semibold text-brand transition hover:text-brand-hover disabled:cursor-not-allowed disabled:opacity-40">Next lesson <ChevronRight className="h-4 w-4" /></button></footer>
                  </article>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-12 border-t border-border pt-8" aria-labelledby="system-map-heading">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,.75fr)_minmax(0,1.25fr)] lg:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Beyond your role path</p><h2 id="system-map-heading" className="mt-2 text-xl font-semibold">Explore the whole SchoolBase system</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Browse the connected product areas and open their dedicated guides. Your role path is the recommended route, not a limit on what you can learn.</p></div><label className="relative block max-w-md"><span className="sr-only">Search system areas</span><BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={moduleSearch} onChange={(event) => setModuleSearch(event.target.value)} placeholder="Find a system area..." className="h-11 w-full border border-border bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/10" /></label></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{filteredModules.map(({ title, description, href, icon: Icon, tint }) => <Link key={title} href={href} className="module-row group flex items-start gap-3 border border-border bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg"><span className={`role-icon role-${tint} flex h-9 w-9 shrink-0 items-center justify-center`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground group-hover:text-brand">{title}</span><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" /></Link>)}</div>
            {filteredModules.length === 0 ? <p className="mt-5 border border-dashed border-border bg-white p-6 text-center text-sm text-muted">No system areas match “{moduleSearch}”. Try another search.</p> : null}
          </section>

          <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:items-center"><p>SchoolBase Learning Centre <span className="mx-1.5 text-border">·</span> Built for the way your school works</p><div className="flex flex-wrap gap-x-4 gap-y-2"><Link href="/staff-training" className="font-semibold text-brand hover:underline">Arrange team training</Link><Link href="/faq" className="font-semibold text-brand hover:underline">Get support</Link></div></footer>
      </div>

      <style jsx>{`
        .role-icon { background: var(--brand-light); color: var(--brand); }
        .role-mint .role-icon { background: #eaf4ff; color: var(--brand); }
        .role-blue .role-icon { background: #edf7f8; color: var(--brand); }
        .role-amber .role-icon { background: #fff7e8; color: #915907; }
        .role-coral .role-icon { background: #fff0f0; color: #a33b43; }
        .role-violet .role-icon { background: #f2efff; color: #604b8d; }
        .role-teal .role-icon { background: #f1f7f4; color: #057642; }
        .animate-guide-in { animation: guide-in 420ms cubic-bezier(.2,.75,.25,1) both; }
        .animate-tile-in { animation: tile-in 480ms cubic-bezier(.2,.75,.25,1) both; }
        .guide-step-enter { animation: guide-in 320ms cubic-bezier(.2,.75,.25,1) both; }
        @keyframes guide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tile-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .animate-guide-in, .animate-tile-in, .guide-step-enter { animation: none; } }
      `}</style>
    </main>
  );
}