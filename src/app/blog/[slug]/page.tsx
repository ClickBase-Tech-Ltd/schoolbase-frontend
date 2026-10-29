import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowRight, BookOpen, ChevronRight, Clock3, Sparkles } from 'lucide-react'
import { blogPosts, getBlogPostBySlug, getRelatedPosts } from '../data'
import { ContextualAdSlot } from '@/components/login-page-ad-slot'

const INTERNAL_LINKS = {
  'schoolbase platform': '/platform',
  'best school management software': '/blog/best-school-management-software',
  'parent communication software': '/blog/parent-communication-software',
  'parent communication': '/blog/parent-communication-software',
  'results publishing software': '/blog/results-publishing-software',
  'results publishing': '/blog/results-publishing-software',
  'school fee management software': '/blog/school-fee-management-software',
  'school website and admissions platform': '/blog/school-website-admissions-platform',
  'school website': '/blog/school-website-admissions-platform',
  'secure school data management': '/blog/secure-school-data-management',
  'digital transformation in schools': '/blog/digital-transformation-in-schools',
  'school broadsheet software': '/blog/school-broadsheet-software',
  'student attendance management software': '/blog/student-attendance-management-software',
  'attendance management': '/blog/student-attendance-management-software',
  'admissions platform': '/blog/school-website-admissions-platform',
  'student records and administration': '/docs/admin',
  'admissions workflows': '/docs/admissions',
  'academic results': '/docs/academics',
  'fee workflows': '/docs/fees',
  'accounting and cashbook': '/docs/accounting',
  'teacher workflows': '/docs/teachers',
  'parent access': '/docs/parents',
  'communication workflows': '/docs/communication',
  'reports and broadsheets': '/docs/reports',
} as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderLinkedText(text: string) {
  const phrases = Object.keys(INTERNAL_LINKS).sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(${phrases.map(escapeRegExp).join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    const lowerCased = part.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(INTERNAL_LINKS, lowerCased)) {
      return (
        <Link
          key={`${part}-${index}`}
          href={INTERNAL_LINKS[lowerCased as keyof typeof INTERNAL_LINKS]}
          className="font-semibold text-brand hover:underline"
        >
          {part}
        </Link>
      )
    }

    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function sectionId(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Blog Post Not Found | SchoolBase',
      description: 'The requested blog post could not be found.',
      alternates: {
        canonical: `https://schoolbase.live/blog/${slug}`,
      },
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const canonicalUrl = `https://schoolbase.live/blog/${post.slug}`
  const imageUrl = post.image ? `https://schoolbase.live${post.image}` : undefined

  return {
    title: `${post.title} | SchoolBase`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: canonicalUrl,
      type: 'article',
      images: imageUrl ? [{ url: imageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = getRelatedPosts(slug)
  const canonicalUrl = `https://schoolbase.live/blog/${post.slug}`
  const imageUrl = post.image ? `https://schoolbase.live${post.image}` : undefined
  const publishedDate = !isNaN(Date.parse(post.publishedAt)) ? new Date(post.publishedAt).toISOString() : undefined
  const updatedDate = post.updatedAt && !isNaN(Date.parse(post.updatedAt))
    ? new Date(post.updatedAt).toISOString()
    : publishedDate

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': canonicalUrl,
            },
            headline: post.title,
            description: post.description,
            image: imageUrl ? [imageUrl] : undefined,
            author: {
              '@type': 'Person',
              name: post.authorName ?? 'SchoolBase',
            },
            publisher: {
              '@type': 'Organization',
              name: 'SchoolBase',
            },
            datePublished: publishedDate,
            dateModified: updatedDate,
          }),
        }}
      />
      <section className="border-b border-border bg-[#f6faff]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-14 lg:py-24">
          <div>
            <Link href="/blog" className="text-sm font-semibold text-brand hover:text-brand-hover">SchoolBase Insights</Link>
            <p className="mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="h-4 w-4" /> {post.category}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              {post.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">{post.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand" />{post.readingTime}</span>
              <span aria-hidden="true">·</span>
              <time>{post.publishedAt}</time>
              {post.updatedAt ? <><span aria-hidden="true">·</span><span>Updated {post.updatedAt}</span></> : null}
              {post.authorName ? <><span aria-hidden="true">·</span><span>{post.authorName}</span></> : null}
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#article" className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
                Read the article <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/blog" className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand hover:text-brand">
                Browse all insights <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-3 border border-brand/20 bg-white shadow-[12px_12px_0_0_#dcecff] sm:inset-5" />
            <div className="relative border border-brand/30 bg-white p-6 shadow-xl sm:p-8">
              {post.image ? <img src={post.image} alt={post.title} className="mb-6 aspect-[16/9] w-full border border-border object-cover" /> : null}
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">The central idea</p>
              <p className="mt-4 text-xl font-semibold leading-8 text-foreground sm:text-2xl">{post.hero}</p>
              <div className="mt-7 flex items-center justify-between border-t border-border pt-5 text-sm text-muted">
                <span>{post.sections.length} sections</span>
                <span>{post.readingTime}</span>
              </div>
              {post.authorRole ? <p className="mt-4 text-sm leading-6 text-muted">{post.authorRole}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">In this article</p>
            <h2 className="mt-3 text-xl font-semibold text-foreground">A clear path through the topic.</h2>
          </div>
          <nav aria-label="Article contents" className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {post.sections.map((section, index) => (
              <a key={section.heading} href={`#${sectionId(section.heading)}`} className="group flex items-start gap-3 border-b border-border pb-3 text-sm text-foreground hover:text-brand">
                <span className="font-semibold text-brand">{String(index + 1).padStart(2, '0')}</span>
                <span className="leading-6">{section.heading}</span>
                <ChevronRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </a>
            ))}
          </nav>
        </div>
      </section>

      <article id="article" className="scroll-mt-8">
        {post.sections.map((section, index) => (
          <section key={section.heading} id={sectionId(section.heading)} className={index % 2 === 0 ? 'py-14 sm:py-20' : 'border-y border-border bg-[#f6faff] py-14 sm:py-20'}>
            <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[0.42fr_1.58fr] lg:gap-14">
              <div>
                <p className="text-sm font-bold tracking-[0.16em] text-brand">{String(index + 1).padStart(2, '0')}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{post.category}</p>
              </div>
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">{section.heading}</h2>
                <div className="mt-6 space-y-5 text-base leading-8 text-muted sm:text-lg">
                  {section.body.map((paragraph) => <p key={paragraph}>{renderLinkedText(paragraph)}</p>)}
                </div>
                {section.bullets ? (
                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3 border border-brand/15 bg-white p-4 text-sm leading-6 text-foreground">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-brand text-xs font-bold text-white">✓</span>
                        <span>{renderLinkedText(bullet)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </article>

      <div className="py-8">
        <div className="mx-auto max-w-6xl px-6"><ContextualAdSlot path={`/blog/${post.slug}`} compact /></div>
      </div>

      {relatedPosts.length ? (
        <section className="border-t border-border bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Keep exploring</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Related insights.</h2>
              </div>
              <Link href="/blog" className="hidden items-center gap-2 text-sm font-semibold text-brand hover:text-brand-hover sm:inline-flex">All articles <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {relatedPosts.map((item, index) => (
                <Link key={item.slug} href={`/blog/${item.slug}`} className="group border border-border bg-background p-6 transition hover:border-brand/40 hover:bg-brand-light/20">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">{item.category} · {String(index + 1).padStart(2, '0')}</p>
                  <h3 className="mt-3 text-xl font-semibold leading-snug text-foreground group-hover:text-brand">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.excerpt}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand">Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-brand py-16 text-white sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">A connected operating platform for schools</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Give every part of your school a clearer place to work.</h2>
            <p className="mt-4 max-w-2xl leading-7 text-white/80">See how SchoolBase connects administration, academics, finance, and families.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/platform" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand transition hover:bg-blue-50">Explore the platform <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Book a demo <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
