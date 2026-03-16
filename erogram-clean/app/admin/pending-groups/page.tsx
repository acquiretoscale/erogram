'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function PendingGroupsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/groups?tab=pending'); }, [router]);
  return null;
}
