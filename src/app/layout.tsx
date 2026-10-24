import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/header";
import FooterWrapper from "@/components/footer-wrapper";
import PublicShellGate from "@/components/public-shell-gate";
import OfflineStatus from "@/components/offline-status";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import PublicWhatsAppContact from "@/components/public-whatsapp-contact";
import { siteDescription, siteOgImage, siteTitle, siteUrl } from "@/lib/site-seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: [
    "school management",
    "fee collection",
    "WhatsApp school communication",
    "student results",
    "school website",
    "attendance tracking",
    "parent communication",
    "school software",
    "education platform",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "SchoolBase",
    statusBarStyle: "default",
  },
  other: {
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#0052cc",
    "google-site-verification": "cAqU-s5g0iU-8bvOexUa_zShdcpkNX7pMX7QKxLQM2A",
  },
  openGraph: {
    siteName: "SchoolBase",
    images: [
      {
        url: siteOgImage,
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [siteOgImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "t16cQxxS0inhasAplgIcn3t1KCZQMYhzt74Nk8zVFxQ",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "SchoolBase Africa",
                url: siteUrl,
                logo: `${siteUrl}/logo.png`,
                founder: {
                  "@type": "Person",
                  name: "Nwokpor Raymond Ikenna",
                },
                areaServed: [
                  { "@type": "Country", name: "Nigeria", identifier: "NG" },
                  { "@type": "Country", name: "Ghana", identifier: "GH" },
                  { "@type": "Country", name: "Sierra Leone", identifier: "SL" },
                  { "@type": "Country", name: "Liberia", identifier: "LR" },
                  { "@type": "Country", name: "The Gambia", identifier: "GM" },
                ],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "SchoolBase",
                url: siteUrl,
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "SchoolBase",
                applicationCategory: "EducationApplication",
                operatingSystem: "Web",
                url: `${siteUrl}/platform`,
                description: siteDescription,
              },
            ]),
          }}
        />
        <PublicShellGate>
          <Header />
        </PublicShellGate>
        <main className="flex-1">{children}</main>
        <PublicShellGate>
          <FooterWrapper />
        </PublicShellGate>
        <PublicShellGate>
          <PublicWhatsAppContact />
        </PublicShellGate>
        <OfflineStatus />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
