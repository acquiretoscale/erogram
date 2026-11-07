'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { LinkExchangePartnerPublic } from '@/lib/actions/linkExchangePartners';
import {
  createLinkExchangePartner,
  removeLinkExchangePartner,
} from '@/lib/actions/linkExchangePartners';

type Props = {
  partners: LinkExchangePartnerPublic[];
};

export default function PartnersClient({ partners: initialPartners }: Props) {
  const [partners, setPartners] = useState(initialPartners);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [href, setHref] = useState('');
  const [logo, setLogo] = useState('');
  const [description, setDescription] = useState('');
  const [exploreListingSlug, setExploreListingSlug] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPartners(initialPartners);
  }, [initialPartners]);

  useEffect(() => {
    try {
      setIsAdmin(localStorage.getItem('isAdmin') === 'true');
    } catch {}
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isAdmin) {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
        }
      })
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setName('');
    setHref('');
    setLogo('');
    setDescription('');
    setExploreListingSlug('');
    setError('');
  };

  const uploadLogo = async (file: File) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Log in as admin to upload a logo.');
      return;
    }
    const hint = name.trim();
    if (!hint) {
      setError('Enter the partner name first — it is used for the logo file on R2.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'partners');
      fd.append('name', hint);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      if (!data.url) throw new Error('Upload failed');
      setLogo(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Log in as admin first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await createLinkExchangePartner(token, {
        name,
        href,
        logo,
        description,
        exploreListingSlug: exploreListingSlug || undefined,
      });
      setPartners((prev) => [
        ...prev,
        {
          id: result.id,
          name: name.trim(),
          href: href.trim(),
          logo: logo.trim(),
          description: description.trim(),
          exploreListingSlug: exploreListingSlug.trim() || undefined,
        },
      ]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save partner');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (id.startsWith('static-')) return;
    if (!window.confirm('Hide this partner from the public page?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setRemovingId(id);
    try {
      await removeLinkExchangePartner(token, id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove partner');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#04140c] text-white">
      <Navbar />

      <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-[#22c55e]/15 bg-[#04140c] mt-24 sm:mt-28">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center text-xs text-gray-500 gap-1.5 min-w-0">
            <Link href="/" className="shrink-0">
              Home
            </Link>
            <span className="shrink-0">/</span>
            <span className="text-white font-semibold truncate">Partners</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 sm:pt-10 pb-16">
        <header className="text-center mb-8 sm:mb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">Trusted Sites & Partners.</h1>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            A curated selection and AI tools, adult platforms, and digital experiences we believe are worth
            discovering.
          </p>
        </header>

        {isAdmin ? (
          <div className="mb-8 rounded-xl border border-[#22c55e]/30 bg-[#0a2016] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm font-semibold text-[#86efac]">Admin — add link-exchange partners</p>
              <button
                type="button"
                onClick={() => {
                  setShowForm((v) => !v);
                  if (showForm) resetForm();
                }}
                className="px-4 py-2 rounded-lg bg-[#22c55e] text-[#04140c] text-sm font-black uppercase tracking-wide hover:opacity-90"
              >
                {showForm ? 'Close' : 'Add partner'}
              </button>
            </div>
            {showForm ? (
              <form onSubmit={(e) => void handleCreate(e)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Name</span>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#04140c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Website URL</span>
                    <input
                      required
                      type="url"
                      value={href}
                      onChange={(e) => setHref(e.target.value)}
                      placeholder="https://"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#04140c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Description</span>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#04140c] px-3 py-2 text-sm text-white"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Logo (WebP on R2)</span>
                    <label className="mt-2 flex flex-col gap-2">
                      <span className="inline-flex">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          id="partner-logo-upload"
                          disabled={uploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadLogo(file);
                            e.target.value = '';
                          }}
                        />
                        <label
                          htmlFor="partner-logo-upload"
                          className={`cursor-pointer px-4 py-2.5 rounded-lg border border-[#22c55e]/40 bg-[#04140c] text-sm font-bold text-[#86efac] hover:bg-[#0f2a1c] ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {uploading ? 'Uploading to R2…' : 'Upload logo image'}
                        </label>
                      </span>
                      <span className="text-[10px] text-white/45 leading-snug">
                        Converts to WebP and saves at{' '}
                        <code className="text-white/55">partners/…-erogram-partner.webp</code> on R2.
                      </span>
                    </label>
                    {logo ? (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" className="h-12 w-auto max-w-[140px] object-contain" />
                        <input
                          required
                          type="url"
                          readOnly
                          value={logo}
                          className="min-w-0 flex-1 rounded border border-white/10 bg-[#04140c] px-2 py-1 text-[11px] text-white/80"
                        />
                      </div>
                    ) : (
                      <input
                        required
                        type="url"
                        value={logo}
                        onChange={(e) => setLogo(e.target.value)}
                        placeholder="Upload a file, or paste an existing logo URL"
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[#04140c] px-3 py-2 text-sm text-white"
                      />
                    )}
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                      Explore listing slug (optional, dofollow)
                    </span>
                    <input
                      value={exploreListingSlug}
                      onChange={(e) => setExploreListingSlug(e.target.value)}
                      placeholder="e.g. ikisoda"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-[#04140c] px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>
                {error ? <p className="text-sm text-red-400">{error}</p> : null}
                <button
                  type="submit"
                  disabled={saving || uploading || !logo.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#c0392f] text-white text-sm font-black uppercase tracking-wide disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Publish partner'}
                </button>
              </form>
            ) : null}
            {!showForm && error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        ) : null}

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {partners.map((partner) => (
            <li key={partner.id} className="h-full relative group">
              {isAdmin && !partner.id.startsWith('static-') ? (
                <button
                  type="button"
                  disabled={removingId === partner.id}
                  onClick={() => void handleRemove(partner.id)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/70 text-white text-lg font-bold opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-opacity disabled:opacity-40"
                  aria-label={`Remove ${partner.name}`}
                  title="Remove from public page"
                >
                  ×
                </button>
              ) : null}
              <a
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
                aria-label={partner.name}
              >
                <article className="bg-[#04140c] rounded-xl overflow-hidden h-full flex flex-col border border-[#22c55e]/20">
                  <div className="w-full h-[120px] sm:h-[132px] bg-white shrink-0 flex items-center justify-center px-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      className="h-14 sm:h-16 w-auto max-w-[260px] object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col flex-grow bg-[#04140c]">
                    <h2 className="text-sm sm:text-base font-black text-white mb-2 leading-tight">{partner.name}</h2>
                    <p className="text-white/75 text-xs sm:text-sm leading-relaxed">{partner.description}</p>
                  </div>
                </article>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </div>
  );
}
