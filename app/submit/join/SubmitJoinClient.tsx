'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuthMethods from '@/components/auth/AuthMethods';
import AuthJoinBenefits from '@/components/auth/AuthJoinBenefits';
import AuthSocialProof from '@/components/auth/AuthSocialProof';
import { AuthAvatarBackground, AuthCard, AuthTabToggle } from '@/components/auth/AuthPageShell';
import { ArrowLeft } from 'lucide-react';

import {
  loadSubmitCreatorDraft,
  saveSubmitCreatorPlan,
  type SubmitCreatorPlan,
} from '@/lib/submitCreatorDraft';

function getResumePath(): string {
  const draft = loadSubmitCreatorDraft();
  if (draft?.submitterType === 'agency') return '/submit/agency?resume=1';
  if (draft) return '/submit/creator?resume=1';
  return '/submit/creator';
}

type Tab = 'join' | 'signin';

function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-2 p-2 rounded-lg bg-red-500/15 border border-red-500/35 text-red-300 text-xs">
      {message}
    </div>
  );
}

export default function SubmitJoinClient({
  avatars,
  totalUsers = 0,
  userAvatars = [],
}: {
  avatars: string[];
  totalUsers?: number;
  userAvatars?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('join');
  const [error, setError] = useState('');

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan === 'free' || plan === 'boosted') {
      saveSubmitCreatorPlan(plan as SubmitCreatorPlan);
    }
  }, [searchParams]);

  useEffect(() => {
    const resumePath = getResumePath();
    sessionStorage.setItem('joinRedirect', resumePath);
    const token = localStorage.getItem('token');
    if (token) router.replace(resumePath);
  }, [router]);

  const googleHref = `/api/auth/google?state=${encodeURIComponent(`redirect:${getResumePath()}`)}`;

  const handleAuthSuccess = useCallback((data: {
    token: string;
    username: string;
    isAdmin: boolean | string;
    firstName?: string | null;
    photoUrl?: string | null;
  }) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('isAdmin', String(data.isAdmin));
    if (data.firstName) localStorage.setItem('firstName', data.firstName);
    else localStorage.removeItem('firstName');
    if (data.photoUrl) localStorage.setItem('photoUrl', data.photoUrl);
    else localStorage.removeItem('photoUrl');

    sessionStorage.removeItem('joinRedirect');
    if (data.isAdmin === 'true' || data.isAdmin === true) router.push('/admin');
    else router.push(getResumePath());
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#060d17]">
      <Navbar variant="onlyfans" />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 pt-[100px] sm:pt-[108px] pb-16 relative overflow-hidden">
        <AuthAvatarBackground avatars={avatars} isAinsfwTheme={false} />

        <div className={`relative z-10 w-[70%] sm:w-full mx-auto ${tab === 'join' ? 'max-w-3xl' : 'max-w-md'}`}>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <AuthCard isAinsfwTheme={false} wide={tab === 'join'}>
            <AuthSocialProof totalUsers={totalUsers} avatars={userAvatars} isAinsfwTheme={false} />
            <AuthTabToggle tab={tab} setTab={setTab} isAinsfwTheme={false} />

            <div className="mb-3">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
                {tab === 'join' ? 'Create a free account' : 'Welcome back'}
              </h1>
              <p className="text-xs text-white/55 mt-0.5">
                {tab === 'join'
                  ? 'Save your creator listing and publish it on Erogram'
                  : 'Sign in to publish your saved creator listing'}
              </p>
            </div>

            {tab === 'join' ? (
              <div className="grid grid-cols-1 md:grid-cols-[1fr,0.9fr] gap-3 md:gap-4 md:items-start">
                <div>
                  <AuthError message={error} />
                  <AuthMethods
                    tab={tab}
                    googleHref={googleHref}
                    isAinsfwTheme={false}
                    onAuthSuccess={handleAuthSuccess}
                    onError={setError}
                  />
                </div>
                <AuthJoinBenefits isAinsfwTheme={false} />
              </div>
            ) : (
              <>
                <AuthError message={error} />
                <AuthMethods
                  tab={tab}
                  googleHref={googleHref}
                  isAinsfwTheme={false}
                  onAuthSuccess={handleAuthSuccess}
                  onError={setError}
                />
              </>
            )}

            <p className="mt-3 text-center text-[10px] text-white/40 leading-relaxed">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-[#0088c2] hover:underline">Terms</Link>
              {' & '}
              <Link href="/privacy" className="text-[#0088c2] hover:underline">Privacy Policy</Link>
            </p>
          </AuthCard>
        </div>
      </main>

      <Footer />
    </div>
  );
}
