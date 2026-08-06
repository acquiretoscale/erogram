import { Suspense } from 'react';

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
