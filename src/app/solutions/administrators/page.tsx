import { Metadata } from 'next'
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Database,
  Lock,
  RefreshCw,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'School Administration Software | SchoolBase',
  description:
    'Manage student records, staff roles, admissions, attendance, fees, and academic workflows with school administration software from SchoolBase.',
  keywords: [
    'school administration software',
    'school data management',
    'admin dashboard school',
    'school operations platform',
  ],
  openGraph: {
    title: 'School Administration Software | SchoolBase',
    description:
      'Manage student records, staff roles, admissions, attendance, fees, and academic workflows with SchoolBase.',
    url: 'https://schoolbase.live/solutions/administrators',
    type: 'website',
  },
  alternates: { canonical: 'https://schoolbase.live/solutions/administrators' },
}

const featureCards = [
  { icon: Database, title: 'Centralized data hub', description: 'Keep students, staff, fees, results, and attendance in one reliable system your team can trust.' },
  { icon: Users, title: 'Role-based access control', description: 'Set permissions by team and keep every user focused on the right work and information.' },
  { icon: Zap, title: 'Bulk operations', description: 'Upload, update, and publish at scale without spending hours on repetitive admin work.' },
  { icon: RefreshCw, title: 'Automated workflows', description: 'Reduce manual reminders, notifications, and recurring actions with built-in automation.' },
  { icon: BarChart3, title: 'Operational analytics', description: 'Monitor school performance, fee health, and operational trends from a live dashboard.' },
  { icon: Lock, title: 'Secure governance', description: 'Protect sensitive school data with role-based access, backups, and structured controls.' },
]

const quickWins = [
  'Replace scattered spreadsheets with one reliable source of truth',
  'Simplify onboarding, role setup, and staff access',
  'Automate routine operations without losing control',
  'Monitor school performance with clear live data',
  'Reduce delays in communication and reporting',
  'Run your school more efficiently every single day',
]

export default function AdministratorsPage() {
  return (
    <div className="overflow-hidden bg-background">
      <section className="relative border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">For administrators</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              A calmer, smarter way to run school operations.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Centralize data, automate routine work, and keep every school function moving without manual bottlenecks or scattered tools.
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Admin workspace</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">One operational dashboard</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white"><Database className="h-5 w-5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Students', value: 'Records', tone: 'bg-[#eaf4ff]' },
                  { label: 'Fees', value: 'Invoices', tone: 'bg-[#f1f7f4]' },
                  { label: 'Tasks', value: 'Workflows', tone: 'bg-[#fff7e8]' },
                  { label: 'Results', value: 'Reports', tone: 'bg-[#f2efff]' },
                  { label: 'Access', value: 'Role-aware', tone: 'bg-[#edf7f8]' },
                  { label: 'Ops', value: 'Administration', tone: 'bg-[#fff0f0]' },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} border border-black/5 p-4`}>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5 text-sm text-muted">
                <span className="font-semibold text-brand">Consistency matters.</span> Data, workflow, and communication all stay aligned.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">The core idea</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">Centralize operations without slowing the school down.</h2>
            <p className="mt-5 text-lg leading-8 text-muted">SchoolBase helps administrators manage student records, fee flow, staff permissions, workflows, and communication from a consistent operating layer that is easier to trust and easier to scale.</p>
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
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">The admin gains that show up first.</h2>
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">A better operating rhythm</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Simplify school operations without losing control of the details.</h2>
          </div>
          <Link href="/signup" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-blue-50">Start Your School <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  )
}
