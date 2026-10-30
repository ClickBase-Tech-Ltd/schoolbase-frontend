import type { Metadata } from 'next'
import { Award, CheckCircle, DollarSign, Smartphone, TrendingUp, Zap } from 'lucide-react'
import { CountrySoftwareDetails } from '@/components/country-software-details'
import { PublicAudienceShell } from '@/components/public-audience-shell'
import { westAfricanCountryAlternates } from '@/lib/site-seo'

const title = 'School Management System in The Gambia | SchoolBase'
const description =
  'School management software for Gambian schools to connect student records, fee tracking, attendance, termly results, report cards, and parent communication.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://schoolbase.live/gambia-school-software', languages: westAfricanCountryAlternates },
  openGraph: {
    title,
    description,
    url: 'https://schoolbase.live/gambia-school-software',
    siteName: 'SchoolBase',
    images: [{ url: 'https://schoolbase.live/og-image.png', width: 1200, height: 630 }],
    locale: 'en_GM',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: ['https://schoolbase.live/og-image.png'] },
}

export default function GambiaPage() {
  return (
    <>
      <PublicAudienceShell
        eyebrow="SchoolBase for Gambian schools"
        title="A school management system for schools in The Gambia."
        description="Connect school administration, academic records, fees, attendance, and parent communication in one organized platform."
        proofLabel="The Gambia school operations"
        proofTitle="One system for the school term"
        sectionLabel="Practical tools for Gambian schools"
        sectionTitle="Make everyday records easier to maintain and use."
        ctaTitle="Give your Gambian school a clearer way to manage its work."
        highlights={['Dalasi fee records', 'Termly assessment records', 'Report cards and broadsheets', 'Attendance tracking', 'Parent access', 'Connected school records']}
        features={[
          { icon: Smartphone, title: 'Information families can reach', description: 'Make relevant published school information easier for authorized families to access.' },
          { icon: DollarSign, title: 'Organized fee activity', description: 'Keep fee schedules, payment records, balances, and receipts together.' },
          { icon: TrendingUp, title: 'Academic reporting', description: 'Manage termly results and prepare student reports within a connected workflow.' },
          { icon: Zap, title: 'Flexible school setup', description: 'Set up your school’s classes, subjects, terms, staff, and student records.' },
          { icon: Award, title: 'Clearer day-to-day oversight', description: 'Bring key administrative and academic information into a more consistent view.' },
          { icon: CheckCircle, title: 'Connected parent updates', description: 'Keep communication organized around the school information families need.' },
        ]}
      />
      <CountrySoftwareDetails
        country="The Gambia"
        currency="Gambian dalasi (GMD)"
        schoolContext="Schools can organize learners, guardians, staff, classes, and academic terms in one place. Connected records make it easier for school leaders and staff to keep routine administration consistent as the term progresses."
        academicContext="Record termly assessments and results, review academic information, and prepare report cards and broadsheets for publication. Your school can continue using its established assessment structure while keeping records organized."
        feesContext="Track fee schedules, payments, outstanding balances, and receipts in Gambian dalasi. Keeping these details alongside student records helps authorized school staff and families follow fee information more clearly."
      />
    </>
  )
}
