/** Visible site label (no www), used beside listing CTAs. */
export function nakedSiteLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : '';
    return `https://${host}${path}`;
  } catch {
    return url;
  }
}

/** Affiliate / tracker href vs clean URL members see. */
export function resolveAinsfwOutbound(tool: { tryNowUrl?: string; sourceUrl?: string }) {
  const href = (tool.tryNowUrl || tool.sourceUrl || '').trim();
  const displaySource = (tool.sourceUrl || tool.tryNowUrl || '').trim();
  const label = displaySource ? nakedSiteLabel(displaySource) : href ? nakedSiteLabel(href) : '';
  return { href, label };
}