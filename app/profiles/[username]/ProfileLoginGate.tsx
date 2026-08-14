'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ProfileLoginGate({
  redirectPath,
  children,
}: {
  redirectPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setAllowed(true);
  }, [router, redirectPath]);

  if (!allowed) {
    return (
      <>
        <Navbar />
        <main
          className="min-h-screen flex items-center justify-center text-sm pt-24 font-[family-name:var(--font-baloo)]"
          style={{ backgroundColor: '#F7F4EC', color: '#6B6568' }}
        >
          Loading…
        </main>
      </>
    );
  }

  return <>{children}</>;
}
