import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Banknote, CheckCircle2, Clock, School, TrendingUp, Users, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Solutions for Schools | SchoolBase',
  description:
    'Tailored solutions for school owners, teachers, parents, and administrators. Streamline operations and improve communication with SchoolBase.',
  keywords: [
    'school management solutions',
    'school management software',
    'school software',
    'school administration system',
    'fee collection system',
    'parent communication app',
  ],
  openGraph: {
    title: 'Solutions for Schools | SchoolBase',
    description: 'Practical SchoolBase workflows for owners, administrators, teachers, parents, and bursars.',
    url: 'https://schoolbase.live/solutions',
    type: 'website',
    images: [
      { url: 'https://schoolbase.live/og-solutions.png', width: 1200, height: 630 },
    ],
  },
  alternates: { canonical: 'https://schoolbase.live/solutions' },
}

const solutions = [
  {
    title: 'For School Owners',
    icon: Users,
    href: '/solutions/school-owners',
    benefits: [
      'Visibility into fees and school operations',
      'Fee payment and invoice tracking',
      'Configured communication workflows',
      'Reports and analytics',
      'Staff and role-aware workspaces',
    ],
    description: 'Review the operational and financial records that help your school make informed decisions.',
  },
  {
    title: 'For Administrators',
    icon: Zap,
    href: '/solutions/administrators',
    benefits: [
      'Centralized data management',
      'Bulk operations and automation',
      'Staff role management',
      'Academic calendar control',
      'Settings, access, and school records',
    ],
    description: 'Automate routine tasks and keep your school organized.',
  },
  {
    title: 'For Principals',
    icon: School,
    href: '/for-principals',
    benefits: [
      'Review connected school operations',
      'Follow academic and attendance records',
      'Monitor fee and enrollment information',
      'Coordinate staff and parent communication',
    ],
    description: 'Bring the information school leaders need into a clearer operating view.',
  },
  {
    title: 'For Bursars',
    icon: Banknote,
    href: '/for-bursars',
    benefits: [
      'Manage fee schedules and invoices',
      'Record payments and issue receipts',
      'Follow balances and payment history',
      'Review school accounting reports',
    ],
    description: 'Keep fee collection and financial records organized in connected workflows.',
  },
  {
    title: 'For Teachers',
    icon: TrendingUp,
    href: '/solutions/teachers',
    benefits: [
      'Enter assessment scores',
      'Review results and analytics',
      'Use configured communication workflows',
      'Generate academic reports',
      'Work with assigned classes and subjects',
    ],
    description: 'Focus on teaching while SchoolBase handles the paperwork.',
  },
  {
    title: 'For Parents',
    icon: Clock,
    href: '/solutions/parents',
    benefits: [
      'View invoices and balances',
      'Review payment history',
      'See published student results',
      'Receive school publications',
      'Access linked-child information',
    ],
    description: "See the school information and published records connected to your children.",
  },
]

export default function SolutionsPage() {
  return (
    <div className="overflow-hidden bg-background">
      <section className="relative border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="relative z-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">SchoolBase by role</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Built for every role in your school.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Whether you are a school owner, administrator, teacher, or parent, SchoolBase gives each role the right workflow, visibility, and communication tools.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Get Started <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="#solutions" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">
                Explore solutions
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] lg:min-h-[430px]">
            <div className="absolute inset-4 border border-brand/20 bg-white shadow-[18px_18px_0_0_#dcecff] sm:inset-8" />
            <div className="relative flex min-h-[360px] flex-col justify-between border border-brand/30 bg-white p-6 shadow-xl sm:min-h-[430px] sm:p-9">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">School roles</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">One system, many workflows</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white"><Users className="h-5 w-5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Owners', value: 'Finance', tone: 'bg-[#eaf4ff]' },
                  { label: 'Admin', value: 'Ops', tone: 'bg-[#f1f7f4]' },
                  { label: 'Teachers', value: 'Results', tone: 'bg-[#fff7e8]' },
                  { label: 'Parents', value: 'Updates', tone: 'bg-[#f2efff]' },
                  { label: 'Fees', value: 'Live', tone: 'bg-[#edf7f8]' },
                  { label: 'Support', value: 'Clear', tone: 'bg-[#fff0f0]' },
                ].map((item) => (
                  <div key={item.label} className={`${item.tone} border border-black/5 p-4`}>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="mt-3 text-xl font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-5 text-sm text-muted">
                <span className="font-semibold text-brand">Connected by design.</span> Every role sees the school in the right context.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">The platform</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">The right workflow for the right people.</h2>
            <p className="mt-5 text-lg leading-8 text-muted">Each SchoolBase solution is built to solve the real work that schools do every day — from finance and operations to teaching and parent communication.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {solutions.map((solution) => {
              const Icon = solution.icon
              return (
                <Link key={solution.title} href={solution.href} className="group border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted transition group-hover:translate-x-1 group-hover:text-brand" />
                  </div>
                  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-brand">Role-based solution</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground">{solution.title}</h3>
                  <p className="mt-3 leading-7 text-muted">{solution.description}</p>
                  <ul className="mt-5 space-y-2.5">
                    {solution.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3 text-sm text-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f6faff] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">How it connects</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">From daily admin to parent visibility, in one connected flow.</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { number: '01', title: 'School operations', text: 'Administration, staffing, classes, and school data stay aligned in one place.' },
              { number: '02', title: 'Academics', text: 'Results, assessments, and performance information are organized around the learning journey.' },
              { number: '03', title: 'Fees & finance', text: 'Collections, invoices, and payment records are tracked with cleaner visibility.' },
              { number: '04', title: 'Parent communication', text: 'Announcements, fee reminders, and student updates reach families without friction.' },
            ].map((step) => (
              <div key={step.number} className="border-t-2 border-brand bg-white p-6">
                <p className="text-sm font-bold text-brand">{step.number}</p>
                <h3 className="mt-7 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 leading-7 text-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">A school operating platform</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Choose the workflow that fits your school and grow from there.</h2>
          </div>
          <Link href="/signup" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-blue-50">Start Your School <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  )
}
