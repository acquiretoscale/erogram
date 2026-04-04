'use client';

import { ReactNode, Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import SiteBeacon from './SiteBeacon';
import AdminSaleAlert from './AdminSaleAlert';
import CookieBanner from './CookieBanner';
import AgeGate from './AgeGate';

interface LayoutWrapperProps {
  children: ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}><SiteBeacon /></Suspense>
      <Suspense fallback={null}><AdminSaleAlert /></Suspense>
      {children}
      <CookieBanner />
      <AgeGate />
    </ErrorBoundary>
  );
}