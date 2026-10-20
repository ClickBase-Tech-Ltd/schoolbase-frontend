import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { faTiktok } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { schoolbaseSocialLinks } from "@/lib/social-links";

const icons = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: null,
  linkedin: Linkedin,
};

export function SocialLinkList({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      {schoolbaseSocialLinks.map(({ platform, label, href }) => {
        const Icon = icons[platform];
        return (
          <a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={`SchoolBase on ${label}`} className="inline-flex min-h-9 items-center gap-2 text-sm text-current hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : <FontAwesomeIcon icon={faTiktok} className="h-4 w-4" aria-hidden="true" />}
            <span>{label}</span>
          </a>
        );
      })}
    </div>
  );
}