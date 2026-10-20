export type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'tiktok' | 'linkedin';

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  href: string;
};

const socialCandidates: Array<{ platform: SocialPlatform; label: string; value: string | undefined; hosts: string[] }> = [
  { platform: 'facebook', label: 'Facebook', value: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL ?? 'https://www.facebook.com/profile.php?id=61590433838771', hosts: ['facebook.com', 'fb.com'] },
  { platform: 'instagram', label: 'Instagram', value: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL, hosts: ['instagram.com'] },
  { platform: 'youtube', label: 'YouTube', value: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL, hosts: ['youtube.com', 'youtu.be'] },
  { platform: 'tiktok', label: 'TikTok', value: process.env.NEXT_PUBLIC_SOCIAL_TIKTOK_URL, hosts: ['tiktok.com'] },
  { platform: 'linkedin', label: 'LinkedIn', value: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL ?? 'https://www.linkedin.com/company/135695122/', hosts: ['linkedin.com'] },
];

function isAllowedSocialUrl(value: string | undefined, hosts: string[]): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export const schoolbaseSocialLinks: SocialLink[] = socialCandidates.flatMap(({ platform, label, value, hosts }) =>
  isAllowedSocialUrl(value, hosts) ? [{ platform, label, href: value }] : [],
);