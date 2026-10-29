import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, CheckCircle2, Layers3 } from 'lucide-react'

interface ProductFeature { icon: LucideIcon; title: string; description: string }
interface ProductLink { href: string; label: string }
interface PublicProductShellProps { eyebrow: string; title: string; description: string; proofTitle: string; highlights: string[]; features: ProductFeature[]; sectionTitle: string; ctaTitle: string; secondaryHref?: string; secondaryLabel?: string; relatedLinks?: ProductLink[] }

export function PublicProductShell({ eyebrow, title, description, proofTitle, highlights, features, sectionTitle, ctaTitle, secondaryHref = '/platform', secondaryLabel = 'Explore the platform', relatedLinks }: PublicProductShellProps) {
  return <main className="overflow-hidden bg-background">
    <section className="relative border-b border-border bg-[#f6faff]"><div className="mx-auto grid max-w-6xl gap-14 px-6 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div className="relative z-10"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p><h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">{description}</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">Get Started <ArrowRight className="h-4 w-4" /></Link><Link href={secondaryHref} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">{secondaryLabel}</Link></div></div><div className="relative min-h-[360px] lg:min-h-[430px]"><div className="absolute inset-4 border border-brand/20 bg-white shadow-[18px_18px_0_0_#dcecff] sm:inset-8" /><div className="relative flex min-h-[360px] flex-col justify-between border border-brand/30 bg-white p-6 shadow-xl sm:min-h-[430px] sm:p-9"><div className="flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">SchoolBase product</p><p className="mt-2 text-xl font-semibold text-foreground">{proofTitle}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-white"><Layers3 className="h-5 w-5" /></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{highlights.slice(0, 6).map((item, index) => <div key={item} className={`${['bg-[#eaf4ff]', 'bg-[#f1f7f4]', 'bg-[#fff7e8]', 'bg-[#f2efff]', 'bg-[#edf7f8]', 'bg-[#fff0f0]'][index % 6]} border border-black/5 p-4`}><p className="text-xs text-muted">SchoolBase</p><p className="mt-3 text-sm font-semibold leading-5 text-foreground">{item}</p></div>)}</div><div className="border-t border-border pt-5 text-sm text-muted"><span className="font-semibold text-brand">Built for daily work.</span> A connected workflow that keeps your team moving.</div></div></div></div></section>
    <section className="py-20 sm:py-24"><div className="mx-auto max-w-6xl px-6"><div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">The core workflow</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{sectionTitle}</h2></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title: featureTitle, description: featureDescription }) => <div key={featureTitle} className="border border-border bg-white p-6 transition hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"><div className="flex h-11 w-11 items-center justify-center bg-brand-light text-brand"><Icon className="h-5 w-5" /></div><h3 className="mt-6 text-xl font-semibold text-foreground">{featureTitle}</h3><p className="mt-3 leading-7 text-muted">{featureDescription}</p></div>)}</div></div></section>
    <section className="border-y border-border bg-[#f6faff] py-20 sm:py-24"><div className="mx-auto max-w-6xl px-6"><div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">What improves immediately</p><h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">A cleaner system for the work behind the scenes.</h2></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((item) => <div key={item} className="flex items-start gap-3 border border-border bg-white p-5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" /><span className="text-sm leading-7 text-foreground">{item}</span></div>)}</div></div></section>
    {relatedLinks?.length ? (
      <section className="border-t border-border bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Explore the workflows</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">See how each part of SchoolBase works.</h2>
            <p className="mt-4 leading-7 text-muted">Review practical guides to the school teams, records, and workflows managed in the platform.</p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block h-full border border-border bg-background p-5 text-sm font-semibold text-foreground transition hover:border-brand/50 hover:text-brand">
                  {item.label} <ArrowRight className="ml-1 inline h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ) : null}
    <section className="bg-brand py-16 text-white sm:py-20"><div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">SchoolBase</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{ctaTitle}</h2></div><Link href="/signup" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-blue-50">Start Your School <ArrowRight className="h-4 w-4" /></Link></div></section>
  </main>
}
