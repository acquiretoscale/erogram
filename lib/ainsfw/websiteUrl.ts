/** Accepts name.com, www.name.com, http://, https:// and returns a full URL, or ''. */
export function normalizeWebsiteUrl(raw: string): string {
  let s = raw.trim().replace(/\s+/g, '');
  if (!s) return '';
  s = s.replace(/^<|>$/g, '');
  if (s.startsWith('//')) s = `https:${s}`;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return '';
    return u.href;
  } catch {
    return '';
  }
}
