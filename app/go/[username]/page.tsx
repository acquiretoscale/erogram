// GONE FOREVER (owner decree 2026-09-14).
// /go/* was an OnlyFans click-hop that Google recrawled 11K+ times and burned
// the entire crawl budget, deranking critical pages. Hard 410 so Google drops
// every /go/ URL permanently. No redirect. No index. No revalidate.
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return [];
}

// A route segment cannot itself emit a 410 status from the page component, so
// the real 410 is served by middleware.ts for every /go/* path. This component
// only exists as a safety net; middleware intercepts first.
export default function GoGonePage() {
  notFound();
}
