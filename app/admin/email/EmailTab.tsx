'use client';

import { useState, useEffect } from 'react';
import { getEmailConfigStatus, sendTestEmail, type EmailConfigStatus } from '@/lib/actions/adminEmail';

export default function EmailTab() {
  const [status, setStatus] = useState<EmailConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';
    getEmailConfigStatus(token).then((r) => {
      if ('error' in r) setError(r.error);
      else setStatus(r);
      setLoading(false);
    });
  }, []);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    const token = localStorage.getItem('token') || '';
    const r = await sendTestEmail(token, to, subject, body);
    setResult(r.ok ? { ok: true, msg: `Sent to ${to}` } : { ok: false, msg: r.error || 'Failed to send.' });
    setSending(false);
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c0392f]" /></div>;
  }
  if (error) {
    return <div className="p-8 text-red-300 text-sm">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white">Email</h1>
        <p className="text-gray-400 text-sm mt-0.5">SMTP connection status and a test sender.</p>
      </div>

      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`h-2.5 w-2.5 rounded-full ${status?.configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="text-sm font-bold text-white">{status?.configured ? 'SMTP configured' : 'SMTP not configured'}</span>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-xs">
          <dt className="text-gray-500 font-semibold">Host</dt><dd className="text-gray-200">{status?.host || '—'}</dd>
          <dt className="text-gray-500 font-semibold">Port</dt><dd className="text-gray-200">{status?.port || '—'}</dd>
          <dt className="text-gray-500 font-semibold">Username</dt><dd className="text-gray-200">{status?.user || '—'}</dd>
          <dt className="text-gray-500 font-semibold">From</dt><dd className="text-gray-200">{status?.from || '—'}</dd>
        </dl>
        {!!status?.missing.length && (
          <p className="mt-3 text-[11px] text-amber-300">Missing in .env.local: {status.missing.join(', ')}</p>
        )}
      </div>

      <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
        <h2 className="text-sm font-black text-white mb-3">Send a test email</h2>
        <div className="space-y-2.5">
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipient email"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={7}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40 resize-y" />
          <button onClick={handleSend} disabled={sending || !status?.configured}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-[#c0392f] text-white hover:bg-[#a83227] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            {sending ? 'Sending…' : 'Send test'}
          </button>
          {result && (
            <p className={`text-xs font-semibold ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
