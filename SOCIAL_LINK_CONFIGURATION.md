# SchoolBase Social Link Configuration

The website header, footer, school administrator dashboard, and Organization `sameAs` metadata read official URLs from these public frontend environment variables:

| Variable | Required value |
| --- | --- |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK_URL` | `https://www.facebook.com/people/ClickBase-Technologies-Ltd/61577572757498/` |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL` | Owner-confirmed SchoolBase Instagram profile URL, if available |
| `NEXT_PUBLIC_SOCIAL_YOUTUBE_URL` | Owner-confirmed SchoolBase YouTube channel URL, if available |
| `NEXT_PUBLIC_SOCIAL_TIKTOK_URL` | Owner-confirmed SchoolBase TikTok profile URL, if available |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN_URL` | `https://www.linkedin.com/company/106371744/` |

Only HTTPS URLs on the relevant platform's domain are rendered. Empty, malformed, or wrong-platform values are omitted rather than replaced by a placeholder. These are public URLs, not secrets; configure them in the frontend production environment and restart/rebuild the frontend after changes.

The Facebook URL was opened and resolves to a public page named **ClickBase Technologies Ltd**, whose profile links to `clickbasegroup.com`; it is the SchoolBase parent-company account, not a page named SchoolBase. The LinkedIn URL is the company-ID destination already used in the existing SchoolBase header/footer, but LinkedIn requires sign-in in the current browser, so its page identity could not be independently read. Both links are now configured as defaults; environment variables can override them. Confirm the LinkedIn page identity and decide whether the parent-company Facebook page is the intended destination before production rollout. Instagram, YouTube, and TikTok URLs remain unprovided and are omitted.