'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ListingContentReview, { type ListingPreviewData } from '../ListingContentReview';
import {
  getAINSFWListingDraft,
  saveAINSFWListingDraft,
  type AINSFWListingDraft,
} from '@/lib/actions/ainsfwPayment';
import { AINSFW_PLAN_PRICES, type AINSFWPlan } from '@/lib/ainsfw/planPrices';

const ACCENT = '#22c55e';
const BORDER = '3px solid #000000';
const SHADOW = '4px 4px 0px #000000';
const CTA = '#facc15';

export default function AINSFWPreviewClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');
  const planParam = searchParams.get('plan') as AINSFWPlan | null;

  const [username, setUsername] = useState<string | null>(null);
  const [draft, setDraft] = useState<AINSFWListingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const updateDraft = (patch: Partial<ListingPreviewData>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const categories = patch.categories ?? prev.categories;
      return {
        ...prev,
        ...patch,
        toolName: patch.toolName ?? prev.toolName,
        category: categories[0] ?? prev.category,
        categories,
      };
    });
  };

  const uploadLogo = async (file: File) => {
    if (!draft) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setUploadingLogo(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'ainsfw');
      fd.append('name', draft.toolName.trim());
      fd.append('category', draft.category);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
      updateDraft({ logoUrl: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadVideo = async (file: File) => {
    if (!draft) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);
    if (!isVideo) {
      setError('Please select an MP4, WebM, or MOV file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Video must be under 2 MB.');
      return;
    }
    setUploadingVideo(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'ainsfw');
      fd.append('name', `${draft.toolName.trim()}-video`);
      fd.append('category', draft.category);
      const res = await fetch('/api/upload/video', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
      updateDraft({ videoUrl: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  useEffect(() => {
    if (!draftId) {
      router.replace('/add/ainsfw');
      return;
    }

    void (async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || undefined;
      const result = await getAINSFWListingDraft(draftId, token);
      if (!result.success || !result.draft) {
        setError(result.error || 'Draft not found.');
        setLoading(false);
        return;
      }
      const loaded = result.draft;
      const plan = planParam && AINSFW_PLAN_PRICES[planParam] != null ? planParam : loaded.plan;
      setDraft({ ...loaded, plan });
      setLoading(false);
    })();
  }, [draftId, planParam, router]);

  const handleSubmit = async () => {
    if (!draft) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || undefined;
      const saveResult = await saveAINSFWListingDraft(
        draft.plan,
        {
          toolName: draft.toolName,
          websiteUrl: draft.websiteUrl,
          email: draft.email,
          contactTelegram: draft.contactTelegram,
          description: draft.description,
          logoUrl: draft.logoUrl,
          category: draft.categories[0] || draft.category,
          extraCategories: draft.categories,
          vendor: draft.toolName,
          tags: draft.categories.flatMap((c) => [c, c.toLowerCase()]).join(', '),
          subscription: draft.subscription,
          paymentMethods: draft.paymentMethods,
          screenshots: draft.screenshots || [],
          videoUrl: draft.videoUrl || '',
        },
        token,
        draft.submissionId,
        { requireContact: false },
      );
      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save listing.');
        return;
      }
      window.location.href = `/add/ainsfw/checkout?draft=${draft.submissionId}`;
    } catch {
      setError('Failed to continue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ainsfw-page ainsfw-bg min-h-screen text-white">
      <Navbar username={username} setUsername={setUsername} />

      <main className="max-w-[50.4rem] mx-auto px-4 sm:px-6 lg:px-8 pt-[4.75rem] sm:pt-20 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-16">
        <div className="flex items-center gap-2 text-sm font-bold text-white/30 mb-6 uppercase tracking-widest">
          <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
          <span className="text-white/20">/</span>
          <Link href="/add/ainsfw" className="hover:text-white/60 transition-colors">Add</Link>
        </div>

        {loading ? (
          <p className="text-center text-white/50 py-20">Loading preview...</p>
        ) : !draft ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-red-400 font-bold">{error || 'Preview not available.'}</p>
            <Link href="/add/ainsfw" className="text-[#22c55e] font-bold hover:underline">Back to submit</Link>
          </div>
        ) : (
          <div className="space-y-5">
            <Link href="/add/ainsfw" className="text-[11px] font-black uppercase tracking-widest text-white/50 hover:text-white">
              ← Back
            </Link>

            {error && (
              <div className="px-4 py-3 text-sm font-bold text-white bg-red-600" style={{ border: BORDER }}>
                {error}
              </div>
            )}
            {uploadingLogo && (
              <p className="text-sm font-bold text-[#22c55e]">Uploading logo...</p>
            )}
            {uploadingVideo && (
              <p className="text-sm font-bold text-[#22c55e]">Uploading video...</p>
            )}

            <div className="flex items-stretch gap-2 sm:gap-3">
              <div
                className="flex-1 min-w-0 bg-white text-black px-3 py-2.5 sm:px-4 sm:py-3"
                style={{ border: BORDER, boxShadow: SHADOW }}
              >
                <p className="text-xs sm:text-sm font-semibold leading-snug text-black/80">
                  Here you can preview your AINSFW listing, make changes, and get everything ready before going live. You can edit everything later and skip this part.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting || uploadingLogo || uploadingVideo}
                onClick={handleSubmit}
                className="shrink-0 self-stretch px-3 sm:px-4 text-[11px] sm:text-xs font-black uppercase tracking-widest text-black disabled:opacity-50"
                style={{ background: '#ffffff', border: BORDER, boxShadow: SHADOW }}
              >
                {submitting ? '...' : 'Next →'}
              </button>
            </div>

            <ListingContentReview
              name={draft.toolName}
              description={draft.description}
              imageUrl={draft.logoUrl}
              websiteUrl={draft.websiteUrl}
              categories={draft.categories}
              subscription={draft.subscription}
              paymentMethods={draft.paymentMethods}
              screenshots={draft.screenshots}
              videoUrl={draft.videoUrl}
              editable
              categoryLimit={8}
              onChange={updateDraft}
              onLogoUpload={uploadLogo}
              onVideoUpload={uploadVideo}
            />

            <button
              type="button"
              disabled={submitting || uploadingLogo || uploadingVideo}
              onClick={handleSubmit}
              className="w-full py-4 text-base sm:text-sm font-black uppercase tracking-widest text-black transition-all disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px]"
              style={{ background: CTA, border: BORDER, boxShadow: SHADOW }}
            >
              {submitting ? 'Saving...' : 'Next →'}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
