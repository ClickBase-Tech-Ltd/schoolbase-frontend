export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SchoolBase',
    url: 'https://schoolbase.live',
    logo: 'https://schoolbase.live/logo.png',
    description:
      'SchoolBase is an all-in-one school management platform for fee collection, parent communication, and result publishing.',
    sameAs: [
      'https://www.facebook.com/schoolbase',
      'https://www.twitter.com/schoolbase',
      'https://www.linkedin.com/company/schoolbase',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      telephone: '+234800000000',
      email: 'support@schoolbase.live',
      availableLanguage: ['en'],
      areaServed: 'NG',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Lagos',
      addressLocality: 'Lagos',
      addressCountry: 'NG',
    },
    founder: {
      '@type': 'Organization',
      name: 'ClickBase Technologies Ltd',
    },
  },

  product: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SchoolBase',
    description:
      'All-in-one school management platform with fee collection, WhatsApp parent communication, result publishing, and school website.',
    url: 'https://schoolbase.live',
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      description: 'See the current plan prices and billing period on the SchoolBase subscription page.',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '150',
    },
  },

  service: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'School Fee Management',
    description:
      'SchoolBase helps schools track fees, send automated reminders via WhatsApp, and manage payments.',
    provider: {
      '@type': 'Organization',
      name: 'SchoolBase',
      url: 'https://schoolbase.live',
    },
    areaServed: 'NG',
    serviceType: 'School Management Software',
  },

  faq: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How long does it take to set up SchoolBase?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We can have you live in 48 hours. Our onboarding team guides you through data entry and setup.',
        },
      },
      {
        '@type': 'Question',
        name: 'How much does SchoolBase cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Current plan prices and billing periods are shown on the SchoolBase homepage and subscription page. Pricing may change; confirm the amount shown before payment.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do you offer a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, we offer a 7-day free trial with full access to all features. No credit card required.',
        },
      },
    ],
  },

  breadcrumb: {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://schoolbase.live',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Features',
        item: 'https://schoolbase.live/features',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Pricing',
        item: 'https://schoolbase.live/pricing',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'About',
        item: 'https://schoolbase.live/about',
      },
    ],
  },

  localBusiness: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'SchoolBase',
    image: 'https://schoolbase.live/logo.png',
    description: 'School management platform serving West African schools',
    url: 'https://schoolbase.live',
    telephone: '+2349032250338',
    email: 'support@schoolbase.live',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lagos',
      addressCountry: 'NG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '6.5244',
      longitude: '3.3792',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
  },
}

export function StructuredData({ type }: { type: keyof typeof structuredData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData[type]),
      }}
    />
  )
}
