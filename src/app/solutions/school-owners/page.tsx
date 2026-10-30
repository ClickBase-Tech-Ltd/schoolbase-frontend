import { Metadata } from 'next'
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'School Management Software for School Owners | SchoolBase',
  description:
    'Help school owners and proprietors review fee activity, student records, academic reporting, and daily operations in one connected school management platform.',
  keywords: [
    'school owner software',
    'school financial management',
    'fee collection school',
    'school analytics',
  ],
  openGraph: {
    title: 'School Management Software for School Owners | SchoolBase',
    description:
      'Review fee activity, student records, academic reporting, and daily school operations in connected workflows.',
    url: 'https://schoolbase.live/solutions/school-owners',
    type: 'website',
  },
  alternates: { canonical: 'https://schoolbase.live/solutions/school-owners' },
}

const featureCards = [
  { icon: Banknote, title: 'Real-time fee visibility', description: 'Track balances, payment status, and collection health in a single financial overview.' },
  { icon: BarChart3, title: 'Live performance reporting', description: 'See trends across enrollment, tuition, and school-wide financial activity in real time.' },
  { icon: Clock3, title: 'Automated payment reminders', description: 'Send reminders on WhatsApp without having to chase parents manually every week.' },
  { icon: Users, title: 'Role-based access for leaders', description: 'Give bursars, school heads, and admins exactly the information they need to do their jobs.' },
  { icon: Zap, title: 'Bulk operations at scale', description: 'Update fees, create accounts, publish notices, and manage school data faster as you grow.' },
  { icon: ShieldCheck, title: 'Secure financial recordkeeping', description: 'Keep payment records and school data protected with a system built for governance and trust.' },
]

const quickWins = [
  'Reduce manual fee tracking and duplicate reporting',
  'Keep parents informed with clear payment updates',
  'Use one dashboard for fee health, staff activity, and growth data',
  'Scale enrollment without adding more admin overhead',
  'Improve trust through cleaner daily operations',
  'Run your school with the same visibility as a modern business',
]

export default function SchoolOwnersPage() {
  return (
    <div className="overflow-hidden bg-background">
      <section className="relative border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">For school owners</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Run your school with clarity, control, and confidence.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Keep finances transparent, parent communication consistent, and school decisions grounded in live operational data.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Get Started <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="#overview" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">
                See the overview
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[430px]">
            <div className="absolute inset-4 border border-brand/20 bg-white shadow-[18px_18px_0_0_#dcecff] sm:inset-8" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-brand/30 bg-white p-6 shadow-xl sm:min-h-[430px] sm:p-9">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Owner view</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">One connected school picture</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white"><BarChart3 className="h-5 w-5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Fees', value: 'Balances', tone: 'bg-[#eaf4ff]' },
                  { label: 'Students', value: 'Records', tone: 'bg-[#f1f7f4]' },
                  { label: 'Parents', value: 'Linked access', tone: 'bg-[#fff7e8]' },
                  { label: 'Results', value: 'Reports', tone: 'bg-[#f2efff]' },
                  { label: 'Teams', value: 'Role-based', tone: 'bg-[#edf7f8]' },
                  { label: 'Growth', value: 'Operational view', tone: 'bg-[#fff0f0]' },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} border border-black/5 p-4`}>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5 text-sm text-muted">
                <span className="font-semibold text-brand">Operational clarity.</span> The school becomes easier to lead as it scales.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">The core idea</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">One school, one operating view, fewer blind spots.</h2>
            <p className="mt-5 text-lg leading-8 text-muted">SchoolBase is built to give leaders the visibility they need across finances, operations, communication, and school performance without stitching together separate tools.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.title} className="border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg">
                  <div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-3 leading-7 text-muted">{card.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f6faff] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">What improves immediately</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">The practical wins owners notice first.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickWins.map((item) => (
              <div key={item} className="flex items-start gap-3 border border-border bg-white p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span className="text-sm leading-7 text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">A stronger operating model</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">See the full picture of your school, without the chaos.</h2>
          </div>
          <Link href="/signup" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-blue-50">Start Your School <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  )
}
