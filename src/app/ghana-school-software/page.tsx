import type { Metadata } from 'next'
import { Award, CheckCircle, DollarSign, Smartphone, TrendingUp, Zap } from 'lucide-react'
import { CountrySoftwareDetails } from '@/components/country-software-details'
import { PublicAudienceShell } from '@/components/public-audience-shell'
import { westAfricanCountryAlternates } from '@/lib/site-seo'

const title = 'School Management System in Ghana | SchoolBase'
const description =
	'School management software for Ghanaian schools to connect student records, fees, attendance, termly results, report cards, and parent communication.'

export const metadata: Metadata = {
	title,
	description,
	alternates: { canonical: 'https://schoolbase.live/ghana-school-software', languages: westAfricanCountryAlternates },
	openGraph: { title, description, url: 'https://schoolbase.live/ghana-school-software', siteName: 'SchoolBase', images: [{ url: 'https://schoolbase.live/og-image.png', width: 1200, height: 630 }], locale: 'en_GH', type: 'website' },
	twitter: { card: 'summary_large_image', title, description, images: ['https://schoolbase.live/og-image.png'] },
}

export default function GhanaPage() {
	return <>
	<PublicAudienceShell eyebrow="SchoolBase for Ghana schools" title="A school management system for Ghanaian schools." description="Bring school administration, fees, results, communication, and parent updates together in one practical system." proofLabel="Ghana school operations" proofTitle="A clearer platform for daily work" sectionLabel="Built for Ghana schools" sectionTitle="Keep school operations connected from fees to results." ctaTitle="Give your Ghana school a stronger operating foundation." highlights={['Cedi fee records', 'Termly results', 'Fees and receipts', 'Results and broadsheets', 'WhatsApp communication', 'Mobile-ready workflows']} features={[{ icon: Smartphone, title: 'Connected payment records', description: 'Keep fee payment activity organized alongside student records.' }, { icon: DollarSign, title: 'Clear fee operations', description: 'Create fee schedules, track balances, and keep receipts organized for school teams and parents.' }, { icon: TrendingUp, title: 'Academic visibility', description: 'Manage results and broadsheets in a format teachers and leaders can understand.' }, { icon: Zap, title: 'Practical setup', description: 'Bring your school structure, staff, students, and workflows into one connected system.' }, { icon: Award, title: 'Ghana-focused workflows', description: 'Set up school processes around your terms, classes, and academic reporting needs.' }, { icon: CheckCircle, title: 'Mobile-ready access', description: 'Give staff and families useful school information on the devices they already use.' }]} />
		<CountrySoftwareDetails country="Ghana" currency="Ghanaian cedis (GHS)" schoolContext="Keep learner and guardian records, classes, staff, and term information organized around your school’s structure. Connected administration makes it easier for Ghanaian school teams to maintain consistent records throughout the academic year." academicContext="Manage termly assessments and results, then prepare report cards and broadsheets for review and publication. Schools can use their own grading and approval practices while keeping academic records accessible to the right staff." feesContext="Record school fees, payment activity, balances, and receipts in Ghanaian cedis. Organizing this information with student records helps staff follow up and gives authorized families a clearer view of relevant details." />
	</>
}
