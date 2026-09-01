'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/** Clarity runs only on premium and profile pages, never site-wide. */
const CLARITY_PATHS = /^(?:\/(?:de|es|pt))?\/(?:premium|profile|profiles)(?:\/|$)/;

export default function ClarityScript() {
  const pathname = usePathname() || '';
  if (!CLARITY_PATHS.test(pathname)) return null;

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "u6pq8y3hqz");
      `}
    </Script>
  );
}
