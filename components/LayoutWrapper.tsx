'use client';

import { ReactNode, Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import SiteBeacon from './SiteBeacon';

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}><SiteBeacon /></Suspense>
      {children}
    </ErrorBoundary>
  );
}