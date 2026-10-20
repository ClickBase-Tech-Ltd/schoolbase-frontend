const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeVideoId(videoUrl: string): string | null {
  try {
    const url = new URL(videoUrl);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
    }
    return youtubeIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(videoUrl: string): string | null {
  const id = getYouTubeVideoId(videoUrl);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function getEmbedUrl(videoUrl: string): string {
  const youtubeId = getYouTubeVideoId(videoUrl);
  if (youtubeId) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;

  try {
    const url = new URL(videoUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (url.protocol !== 'https:') return '';
    if (host === 'loom.com' && /^\/share\/[a-zA-Z0-9]+$/.test(url.pathname)) {
      return `https://www.loom.com/embed/${url.pathname.split('/')[2]}`;
    }
    if (host === 'vimeo.com' && /^\/\d+$/.test(url.pathname)) {
      return `https://player.vimeo.com/video/${url.pathname.slice(1)}`;
    }
    if (host === 'player.vimeo.com' && /^\/video\/\d+$/.test(url.pathname)) return url.toString();
  } catch {
    return '';
  }
  return '';
}
