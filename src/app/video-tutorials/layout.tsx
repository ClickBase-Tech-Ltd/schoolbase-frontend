import type { Metadata } from 'next'

const title = 'SchoolBase Video Tutorials | School Management Guides'
const description =
  'Watch SchoolBase tutorials for school administrators, teachers, bursars, and families. Learn how to use school records, fees, results, and communication workflows.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://schoolbase.live/video-tutorials' },
  openGraph: {
    title,
    description,
    url: 'https://schoolbase.live/video-tutorials',
    siteName: 'SchoolBase',
    images: [{ url: 'https://schoolbase.live/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['https://schoolbase.live/og-image.png'],
  },
}

export default function VideoTutorialsLayout({ children }: { children: React.ReactNode }) {
  return children
}
