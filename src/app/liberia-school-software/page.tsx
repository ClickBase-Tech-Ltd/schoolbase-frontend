import type { Metadata } from 'next'
import { Award, CheckCircle, DollarSign, Smartphone, TrendingUp, Zap } from 'lucide-react'
import { CountrySoftwareDetails } from '@/components/country-software-details'
import { PublicAudienceShell } from '@/components/public-audience-shell'
import { westAfricanCountryAlternates } from '@/lib/site-seo'

const title = 'School Management Software in Liberia | SchoolBase'
const description =
  'School software for Liberian schools to manage termly results, report cards, attendance, parent communication, and fee records in Liberian dollars.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://schoolbase.live/liberia-school-software', languages: westAfricanCountryAlternates },
  openGraph: {
    title,
    description,
    url: 'https://schoolbase.live/liberia-school-software',
    siteName: 'SchoolBase',
    images: [{ url: 'https://schoolbase.live/og-image.png', width: 1200, height: 630 }],
    locale: 'en_LR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: ['https://schoolbase.live/og-image.png'] },
}

export default function LiberiaPage() {
  return (
    <>
      <PublicAudienceShell
        eyebrow="SchoolBase for Liberia schools"
        title="School management software for schools in Liberia."
        description="Bring student records, fees, termly results, attendance, and parent updates into one connected system for your school."
        proofLabel="Liberia school operations"
        proofTitle="A connected view of school activity"
        sectionLabel="Built for practical school management"
        sectionTitle="Spend less time reconciling records across separate tools."
        ctaTitle="Help your Liberian school keep its work organized."
        highlights={['Liberian dollar fee records', 'Termly results', 'Report cards and broadsheets', 'Student attendance', 'Parent access', 'Connected administration']}
        features={[
          { icon: Smartphone, title: 'Useful access for families', description: 'Keep published school information and relevant updates easier for families to reach.' },
          { icon: DollarSign, title: 'Fee and payment tracking', description: 'Organize fee schedules, payment entries, balances, and receipts for school teams.' },
          { icon: TrendingUp, title: 'Results and reporting', description: 'Keep termly assessments, results, and student reports together for review.' },
          { icon: Zap, title: 'Your school structure', description: 'Configure classes, subjects, terms, staff roles, and student records around your school.' },
          { icon: Award, title: 'More consistent administration', description: 'Use connected records to support routine decisions across academic and school operations.' },
          { icon: CheckCircle, title: 'Parent communication', description: 'Coordinate family updates with attendance, fee, and result information.' },
        ]}
      />
      <CountrySoftwareDetails
        country="Liberia"
        currency="Liberian dollars (LRD)"
        schoolContext="Liberian schools can keep student, guardian, class, and staff information together and organize it around their own academic terms. A shared record base helps administrators, teachers, and school leaders work from consistent information."
        academicContext="Manage term-based assessments and results, then prepare report cards and broadsheets through a connected workflow. School teams retain their own assessment approach while making information easier to review and publish."
        feesContext="Maintain fee schedules and record payments, balances, and receipts in Liberian dollars. A clear record of fee activity helps school staff follow up and gives authorized families a better view of their student’s information."
      />
    </>
  )
}
