import type { Metadata } from 'next'
import { BarChart3, BookOpen, CheckCircle2, GraduationCap, School, Users } from 'lucide-react'
import { PublicProductShell } from '@/components/public-product-shell'
export const metadata: Metadata = {
	title: 'School Software for African Schools | SchoolBase',
	description: 'Software for schools in Nigeria and West Africa to manage student records, admissions, fees, attendance, results, and parent communication in one connected school management platform.',
	alternates: { canonical: 'https://schoolbase.live/school-management-software' },
	openGraph: {
		title: 'School Software for African Schools | SchoolBase',
		description: 'Software for schools in Nigeria and West Africa to manage student records, admissions, fees, attendance, results, and parent communication.',
		url: 'https://schoolbase.live/school-management-software',
		type: 'website',
	},
}
export default function SchoolManagementSoftwarePage() {
	return <PublicProductShell
		eyebrow="School management platform"
		title="Practical school software for connected school management."
		description="SchoolBase gives schools one connected platform for administration, student records, admissions, fees, attendance, academics, results, accounting, and parent communication."
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
			{ href: '/blog/best-school-management-software', label: 'School software buying guide' },
			{ href: '/nigeria-school-software', label: 'School software in Nigeria' },
			{ href: '/ghana-school-software', label: 'School software in Ghana' },
		]}
	/>
}
