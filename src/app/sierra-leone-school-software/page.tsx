import type { Metadata } from 'next'
import { Award, CheckCircle, DollarSign, Smartphone, TrendingUp, Zap } from 'lucide-react'
import { CountrySoftwareDetails } from '@/components/country-software-details'
import { PublicAudienceShell } from '@/components/public-audience-shell'
import { westAfricanCountryAlternates } from '@/lib/site-seo'

const title = 'School Management System in Sierra Leone | SchoolBase'
const description =
  'School management software for Sierra Leone schools to connect student records, fee tracking, attendance, termly results, report cards, and parent access.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://schoolbase.live/sierra-leone-school-software', languages: westAfricanCountryAlternates },
  openGraph: {
    title,
    description,
    url: 'https://schoolbase.live/sierra-leone-school-software',
    siteName: 'SchoolBase',
    images: [{ url: 'https://schoolbase.live/og-image.png', width: 1200, height: 630 }],
    locale: 'en_SL',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: ['https://schoolbase.live/og-image.png'] },
}

export default function SierraLeonePage() {
  return (
    <>
      <PublicAudienceShell
        eyebrow="SchoolBase for Sierra Leone schools"
        title="A school management system for schools in Sierra Leone."
        description="Connect school administration, termly academic records, fee tracking, attendance, and parent communication in one practical platform."
        proofLabel="Sierra Leone school operations"
        proofTitle="Clearer records for every school term"
        sectionLabel="Made for everyday school work"
        sectionTitle="Keep academic and administrative records connected."
        ctaTitle="Give your Sierra Leone school a more organized way to work."
        highlights={['New leone fee records', 'Termly results', 'Report cards and broadsheets', 'Attendance records', 'Parent access', 'School-wide communication']}
        features={[
          { icon: Smartphone, title: 'Accessible school information', description: 'Help staff and families reach relevant school information through a connected platform.' },
          { icon: DollarSign, title: 'Organized fee records', description: 'Track charges, payments, balances, and receipts using your school’s fee structure.' },
          { icon: TrendingUp, title: 'Termly academic records', description: 'Keep assessment results and reporting together for review and publication.' },
          { icon: Zap, title: 'School-specific setup', description: 'Set up the classes, terms, subjects, and roles that reflect how your school is organized.' },
          { icon: Award, title: 'Clearer school oversight', description: 'Give school leaders a more consistent view of academic and administrative activity.' },
          { icon: CheckCircle, title: 'Connected parent communication', description: 'Share relevant updates with families alongside the records they relate to.' },
        ]}
      />
      <CountrySoftwareDetails
        country="Sierra Leone"
        currency="new leones (SLE)"
        schoolContext="Schools can organize student and family records, classes, staff responsibilities, and term setup in a single system. This gives school teams a dependable starting point for daily administration without relying on disconnected lists."
        academicContext="Teachers and administrators can manage assessment information by term, review results, and prepare report cards and broadsheets. Schools can keep their established assessment practices while making records easier to find and share."
        feesContext="Record the school’s fee schedule, payments, outstanding balances, and receipts in one place. Families and authorized staff can use connected access to stay informed about relevant school and student information."
      />
    </>
  )
}
