import Link from 'next/link'

const westAfricanCountries = [
  { name: 'Nigeria', href: '/nigeria-school-software' },
  { name: 'Ghana', href: '/ghana-school-software' },
  { name: 'Sierra Leone', href: '/sierra-leone-school-software' },
  { name: 'Liberia', href: '/liberia-school-software' },
  { name: 'The Gambia', href: '/gambia-school-software' },
]

interface CountrySoftwareDetailsProps {
  country: string
  currency: string
  schoolContext: string
  academicContext: string
  feesContext: string
}

export function CountrySoftwareDetails({
  country,
  currency,
  schoolContext,
  academicContext,
  feesContext,
}: CountrySoftwareDetailsProps) {
  return (
    <>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              A practical fit for {country}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              School records that stay useful throughout the term.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted">{schoolContext}</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="border border-border bg-white p-6">
              <h3 className="text-xl font-semibold text-foreground">Termly academics and reporting</h3>
              <p className="mt-3 leading-7 text-muted">{academicContext}</p>
              <Link href="/results-publishing-software" className="mt-5 inline-flex font-semibold text-brand hover:underline">
                Explore results publishing
              </Link>
            </article>
            <article className="border border-border bg-white p-6">
              <h3 className="text-xl font-semibold text-foreground">Fees and family visibility</h3>
              <p className="mt-3 leading-7 text-muted">{feesContext}</p>
              <Link href="/school-fee-management-software" className="mt-5 inline-flex font-semibold text-brand hover:underline">
                Explore school fee management
              </Link>
            </article>
          </div>
          <p className="mt-6 text-sm leading-6 text-muted">
            Schools can maintain fee records in {currency} and confirm the current plan, amount, and payment options during signup.
          </p>
        </div>
      </section>
      <nav aria-label="SchoolBase country pages" className="border-y border-border bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">Explore SchoolBase across West Africa</h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {westAfricanCountries.map(({ name, href }) => (
              <li key={href}>
                <Link href={href} aria-current={name === country ? 'page' : undefined} className="text-brand hover:underline">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  )
}
