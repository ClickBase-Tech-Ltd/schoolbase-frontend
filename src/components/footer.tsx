import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { SocialLinkList } from "@/components/social-link-list";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://schoolbase.live";

export default function Footer() {
  return (
    <footer className="bg-foreground text-white print:hidden">
      {/* Main Footer */}
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-6">
          {/* Brand & Social */}
          <div className="md:col-span-1">
            <h3 className="font-bold text-lg mb-4">SchoolBase</h3>
            <p className="text-sm text-white/70 mb-6">
              The school management system built for West African schools. Fees, attendance, results, and parent communication in one platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <SocialLinkList className="flex flex-wrap gap-3 text-white/70" />
              <a
                href="mailto:support@schoolbase.live"
                className="text-white/70 hover:text-white"
              >
                <Mail className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/2349032250338"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={`${siteUrl}/platform`} className="text-white/70 hover:text-white">SchoolBase Platform</Link></li>
              <li><Link href={`${siteUrl}/docs/admin`} className="text-white/70 hover:text-white">Administration</Link></li>
              <li><Link href={`${siteUrl}/docs/teachers`} className="text-white/70 hover:text-white">Teachers</Link></li>
              <li><Link href={`${siteUrl}/docs/parents`} className="text-white/70 hover:text-white">Parents</Link></li>
              <li><Link href={`${siteUrl}/docs/fees`} className="text-white/70 hover:text-white">Fees & payments</Link></li>
              <li><Link href={`${siteUrl}/schoolbase-login`} className="text-white/70 hover:text-white">SchoolBase login help</Link></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-semibold mb-4">Solutions</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`${siteUrl}/platform`} className="text-white/70 hover:text-white">
                  SchoolBase Platform
                </Link>
              </li>
              <li>
                <Link href={`${siteUrl}/docs/admin`} className="text-white/70 hover:text-white">
                  Platform Guides
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/solutions/school-fee-management`}
                  className="text-white/70 hover:text-white"
                >
                  Fee Management
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/solutions/digital-result-management`}
                  className="text-white/70 hover:text-white"
                >
                  Results Management
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/solutions/student-attendance-tracking`}
                  className="text-white/70 hover:text-white"
                >
                  Attendance Tracking
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/solutions/parent-communication`}
                  className="text-white/70 hover:text-white"
                >
                  Parent Communication
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/solutions/school-broadsheet`}
                  className="text-white/70 hover:text-white"
                >
                  Broadsheet
                </Link>
              </li>
            </ul>
          </div>

          {/* Guides (High Authority) */}
          <div>
            <h4 className="font-semibold mb-4">Learning Guides</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`${siteUrl}/how-to-use-schoolbase`}
                  className="text-white/70 hover:text-white"
                >
                  How to use SchoolBase
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/guides`}
                  className="text-white/70 hover:text-white"
                >
                  All practical guides
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/guides/school-fee-management`}
                  className="text-white/70 hover:text-white"
                >
                  Fee Management Guide
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/guides/digital-report-cards`}
                  className="text-white/70 hover:text-white"
                >
                  Digital Report Cards
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/guides/school-broadsheet`}
                  className="text-white/70 hover:text-white"
                >
                  Broadsheet Guide
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/guides/digital-transformation`}
                  className="text-white/70 hover:text-white"
                >
                  Digital Transformation
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/video-tutorials`}
                  className="text-white/70 hover:text-white"
                >
                  Video Tutorials
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/staff-training`}
                  className="text-white/70 hover:text-white"
                >
                  School-wide staff training
                </Link>
              </li>
            </ul>
          </div>

          {/* Countries */}
          <div>
            <h4 className="font-semibold mb-4">West Africa</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={`${siteUrl}/ghana-school-software`}
                  className="text-white/70 hover:text-white"
                >
                  🇬🇭 Ghana
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/nigeria-school-software`}
                  className="text-white/70 hover:text-white"
                >
                  🇳🇬 Nigeria
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/liberia-school-software`}
                  className="text-white/70 hover:text-white"
                >
                  🇱🇷 Liberia
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/sierra-leone-school-software`}
                  className="text-white/70 hover:text-white"
                >
                  🇸🇱 Sierra Leone
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/gambia-school-software`}
                  className="text-white/70 hover:text-white"
                >
                  🇬🇲 The Gambia
                </Link>
              </li>
            </ul>
          </div>

          {/* ClickBase Ecosystem */}
          <div>
            <h4 className="font-semibold mb-4">ClickBase Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://clickbasegroup.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white"
                >
                  ClickBase Group
                </a>
              </li>
              <li>
                <a
                  href="https://clickinvoice.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white"
                >
                  ClickInvoice
                </a>
              </li>
              <li>
                <a
                  href="https://tradebase.live/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white"
                >
                  TradeBase AI
                </a>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/founder`}
                  className="text-white/70 hover:text-white font-semibold"
                >
                  Founder
                </Link>
              </li>
              <li>
                <Link
                  href={`${siteUrl}/investors`}
                  className="text-white/70 hover:text-white font-semibold"
                >
                  Investors & partners
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="grid gap-6 md:grid-cols-3 text-sm text-white/70 mb-8">
            {/* Comparison Links (SEO) */}
            <div>
              <p className="font-semibold text-white mb-2">Compare</p>
              <div className="space-y-1">
                <Link
                  href={`${siteUrl}/compare/manual-systems`}
                  className="block hover:text-white"
                >
                  vs Manual Systems
                </Link>
                <Link href={`${siteUrl}/compare/edumis`} className="block hover:text-white">
                  vs EduMIS
                </Link>
                <Link href={`${siteUrl}/compare/free-vs-paid`} className="block hover:text-white">
                  Free vs Paid
                </Link>
              </div>
            </div>

            {/* Role Pages (Segmentation) */}
            <div>
              <p className="font-semibold text-white mb-2">For Your Role</p>
              <div className="space-y-1">
                <Link href={`${siteUrl}/for-principals`} className="block hover:text-white">
                  Principals
                </Link>
                <Link href={`${siteUrl}/for-bursars`} className="block hover:text-white">
                  Bursars
                </Link>
                <Link href={`${siteUrl}/for-teachers`} className="block hover:text-white">
                  Teachers
                </Link>
                <Link href={`${siteUrl}/for-parents`} className="block hover:text-white">
                  Parents
                </Link>
              </div>
            </div>

            {/* Industries (Vertical Targeting) */}
            <div>
              <p className="font-semibold text-white mb-2">By School Type</p>
              <div className="space-y-1">
                <Link
                  href={`${siteUrl}/school-management-software-for-secondary-schools`}
                  className="block hover:text-white"
                >
                  Secondary Schools
                </Link>
                <Link
                  href={`${siteUrl}/school-management-software-for-early-childhood-schools`}
                  className="block hover:text-white"
                >
                  Early Childhood
                </Link>
                <Link
                  href={`${siteUrl}/school-management-software-for-international-schools`}
                  className="block hover:text-white"
                >
                  International Schools
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-white/10 bg-black/30 py-6">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/70">
            <div>
              <p>© 2026 SchoolBase. A ClickBase Group product.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms & Conditions
              </Link>
              <Link href="/contact" className="hover:text-white">
                Contact Support
              </Link>
              <Link href="/advertise" className="rounded-full border border-brand/30 bg-brand px-3 py-1.5 font-medium text-white transition hover:bg-brand-hover">
                Advertise with us
              </Link>
            </div>
            <div className="text-right">
              <p>
                <a
                  href="tel:+2349032250338"
                  className="hover:text-white"
                >
                  +234903 225 0338
                </a>
              </p>
              <p className="text-xs">Mon–Sat 8am–8pm WAT</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
