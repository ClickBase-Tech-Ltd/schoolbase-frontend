import type { Metadata } from 'next'
import { BarChart3, BookOpen, CheckCircle2, GraduationCap, School, Users } from 'lucide-react'
import { PublicProductShell } from '@/components/public-product-shell'
export const metadata: Metadata = {
	title: 'School Management Software for African Schools | SchoolBase',
	description: 'School management software for West African schools: organize student records, admissions, fees, attendance, results, and parent communication.',
	alternates: { canonical: 'https://schoolbase.live/school-management-software' },
	openGraph: {
		title: 'School Management Software for African Schools | SchoolBase',
		description: 'Organize student records, admissions, fees, attendance, results, and parent communication in one school platform.',
		url: 'https://schoolbase.live/school-management-software',
		type: 'website',
	},
}
export default function SchoolManagementSoftwarePage() {
	return <PublicProductShell
		eyebrow="School management platform"
		title="School management software that connects your school's daily work."
		description="SchoolBase brings administration, academics, fees, accounting, communication, admissions, teachers, parents, and reporting together in one practical platform."
		proofTitle="One school, one connected system"
		sectionTitle="Give every part of your school a clearer place to work."
		ctaTitle="Build a stronger operating system for your school."
		highlights={['Administration', 'Students and guardians', 'Teachers and classes', 'Academics and results', 'Fees and accounting', 'Parents and communication']}
		features={[
			{ icon: School, title: 'School administration', description: 'Keep the records and workflows behind the school organized in one place.' },
			{ icon: Users, title: 'Students and guardians', description: 'Build a dependable student record that supports every connected operation.' },
			{ icon: GraduationCap, title: 'Academics and results', description: 'Manage classes, assessments, grading, reports, and academic visibility.' },
			{ icon: BookOpen, title: 'Teachers and classes', description: 'Give staff focused tools for attendance, results, and everyday class work.' },
			{ icon: BarChart3, title: 'Fees and accounting', description: 'Connect collection activity and financial insight for better decisions.' },
			{ icon: CheckCircle2, title: 'Parents and communication', description: 'Keep families informed with timely updates and useful access to school information.' },
		]}
		relatedLinks={[
			{ href: '/docs/admin', label: 'Administration and student records' },
			{ href: '/docs/admissions', label: 'Admissions workflows' },
			{ href: '/docs/academics', label: 'Academics and results' },
			{ href: '/docs/fees', label: 'Fees, invoices, and payments' },
			{ href: '/docs/accounting', label: 'Accounting and cashbook' },
			{ href: '/docs/teachers', label: 'Teacher workflows' },
			{ href: '/docs/parents', label: 'Parent portal' },
			{ href: '/docs/communication', label: 'School communication' },
			{ href: '/docs/reports', label: 'Reports and broadsheets' },
		]}
	/>
}
