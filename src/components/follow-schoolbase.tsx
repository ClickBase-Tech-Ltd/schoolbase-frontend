import { SocialLinkList } from "@/components/social-link-list";
import { schoolbaseSocialLinks } from "@/lib/social-links";

export function FollowSchoolBase() {
  return (
    <section aria-labelledby="follow-schoolbase-heading">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Stay connected</p>
      <h2 id="follow-schoolbase-heading" className="mt-1 text-lg font-semibold leading-6 text-foreground">Follow SchoolBase</h2>
      <p className="mt-1 max-w-md text-sm leading-5 text-muted">Join our community for product updates, practical ideas, and news from SchoolBase.</p>
      {schoolbaseSocialLinks.length ? (
        <SocialLinkList className="mt-3 flex flex-wrap gap-x-4 gap-y-1" />
      ) : (
        <p className="mt-3 text-sm leading-5 text-muted">Official social accounts will appear here once configured.</p>
      )}
    </section>
  );
}