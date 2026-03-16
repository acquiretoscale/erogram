'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function CsvImportPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/groups?tab=import'); }, [router]);
  return null;
}
