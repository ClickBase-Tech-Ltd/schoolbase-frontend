import { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { ContentSection, PublicContentShell } from '@/components/public-content-shell'

export const metadata: Metadata = {
  title: 'FAQ | SchoolBase Frequently Asked Questions',
  description:
    'Get answers to frequently asked questions about SchoolBase school management platform, pricing, features, and support.',
  openGraph: {
    title: 'FAQ | SchoolBase',
    description: 'Frequently asked questions about SchoolBase.',
    url: 'https://schoolbase.live/faq',
    type: 'website',
  },
  alternates: { canonical: 'https://schoolbase.live/faq' },
}

const faqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'How long does it take to set up SchoolBase?',
        a: 'Our onboarding team can guide you through school setup, data entry, teacher setup, and the first operational workflows.',
      },
      {
        q: 'Do I need technical skills to use SchoolBase?',
        a: 'No. SchoolBase is designed for school owners, not IT people. If you can use WhatsApp and email, you can use SchoolBase.',
      },
      {
        q: 'Can I try SchoolBase for free?',
        a: 'Yes! We offer a 7-day free trial with full access to all features. No credit card required.',
      },
    ],
  },
  {
    category: 'Pricing',
    questions: [
      {
        q: 'How much does SchoolBase cost?',
        a: 'Current plan prices and billing periods are shown on the SchoolBase homepage and subscription page. Pricing can vary by country and may change; confirm the amount shown before payment.',
      },
      {
        q: 'Is billing per term or annual?',
        a: 'The published Nigeria plans are billed per school term. Contact our team to discuss billing arrangements for your school.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept Paystack (card/bank transfer), direct bank transfers, and cash payments. Contact our team to arrange payment.',
      },
      {
        q: 'Can I cancel my subscription?',
        a: 'Yes. Cancel anytime before your renewal date to avoid charges. We do not offer refunds for partial terms.',
      },
    ],
  },
  {
    category: 'Features',
    questions: [
      {
        q: 'Can I track fees paid in cash and bank transfers?',
        a: 'Yes. SchoolBase tracks all payment methods: Paystack, bank transfers, and cash. Generate receipts for each payment.',
      },
      {
        q: 'Does SchoolBase integrate with WhatsApp?',
        a: 'Yes. Send fee reminders and notifications directly to parent WhatsApp numbers. Fully automated or manual.',
      },
      {
        q: 'How do I publish student results?',
        a: 'Teachers enter marks, you approve, then release to parents with one click. No confusion, no leaks.',
      },
      {
        q: 'Is the school website included?',
        a: 'Yes. Every school gets a professional website for news, admissions, and contact info. No separate Wix bill.',
      },
      {
        q: 'Can parents view their fees and results?',
        a: 'Yes. Parents can log in through the parent portal to view linked children, invoices, payment history, published results, and attendance.',
      },
    ],
  },
  {
    category: 'Data & Security',
    questions: [
      {
        q: 'Is my data secure?',
        a: 'SchoolBase uses secure authentication, role-aware access, and protected connections for school records. Ask the SchoolBase team about the operational safeguards relevant to your deployment.',
      },
      {
        q: 'Where is my data stored?',
        a: 'Your data is stored on secure cloud servers. We comply with data protection standards.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. You can export student data, fees, results, and more at any time.',
      },
      {
        q: 'What happens if I cancel?',
        a: 'Your data remains yours. You can export it anytime. We will delete it upon request.',
      },
    ],
  },
  {
    category: 'Support',
    questions: [
      {
        q: 'What support do you offer?',
        a: 'We provide email support, WhatsApp chat, and phone support during business hours. Response time is typically under 24 hours.',
      },
      {
        q: 'Is there training provided?',
        a: 'Yes. During setup, our team trains your staff on how to use SchoolBase.',
      },
      {
        q: 'Can you help us migrate from our old system?',
        a: 'Yes. We can help import student data and historical records. Talk to our team about your specific needs.',
      },
      {
        q: 'Can parents use SchoolBase on their phone?',
        a: 'Parents can use the web parent portal on the devices they already use to view linked children, invoices, published results, and attendance.',
      },
    ],
  },
]

export default async function FAQPage() {
  const priceAnswer = 'Subscription prices and payment options depend on your school’s billing country. Choose the school’s country on the pricing page to see the applicable plans and payment availability before checkout.';
  const visibleFaqs = faqs.map((category) => category.category === 'Pricing'
    ? { ...category, questions: category.questions.map((item) => item.q === 'How much does SchoolBase cost?' ? { ...item, a: priceAnswer } : item) }
    : category);

  return (
    <PublicContentShell
      eyebrow="SchoolBase help"
      title="Answers for the work your school is preparing to do."
      description="Find practical answers about setup, pricing, school operations, fees, results, communication, security, and support."
      ctaTitle="Still have a question? Talk to the SchoolBase team."
      ctaText="We can help you understand the platform, plan your setup, and choose the right place to start."
      ctaHref="/contact"
      ctaLabel="Contact Support"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: visibleFaqs.flatMap((category) => category.questions).map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          }),
        }}
      />
      <ContentSection title="Frequently asked questions" intro="Open a category to find the answer you need.">
        <div className="grid gap-10 lg:grid-cols-2">
          {visibleFaqs.map((category) => (
            <section key={category.category}>
              <h2 className="text-xl font-semibold text-foreground">{category.category}</h2>
              <div className="mt-4 space-y-3">
                {category.questions.map((item, idx) => (
                  <details key={idx} className="group border border-border bg-white transition hover:border-brand">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-brand transition group-open:rotate-180" />
                    </summary>
                    <p className="border-t border-border px-5 py-4 text-sm leading-7 text-muted">{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ContentSection>
    </PublicContentShell>
  )
}
