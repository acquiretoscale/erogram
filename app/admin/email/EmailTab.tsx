'use client';

import { useState, useEffect } from 'react';
import {
  getEmailConfigStatus,
  getEmailTemplates,
  saveEmailTemplate,
  sendTestEmail,
  type EmailConfigStatus,
  type EmailTemplateRow,
} from '@/lib/actions/adminEmail';

export default function EmailTab() {
  const [status, setStatus] = useState<EmailConfigStatus | null>(null);
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplSaved, setTplSaved] = useState('');
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
    getEmailTemplates(token).then((r) => {
      if (!Array.isArray(r)) return;
      setTemplates(r);
      if (r[0]) {
        setSelectedId(r[0].id);
        setTplSubject(r[0].subject);
        setTplBody(r[0].body);
      }
    });
  }, []);

  const selected = templates.find((t) => t.id === selectedId) || null;

  const pickTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSelectedId(id);
    setTplSubject(t.subject);
    setTplBody(t.body);
    setTplSaved('');
  };

  const handleSaveTemplate = async () => {
    if (!selectedId) return;
    setSavingTpl(true);
    setTplSaved('');
    const token = localStorage.getItem('token') || '';
    const r = await saveEmailTemplate(token, selectedId, tplSubject, tplBody);
    if (r.ok) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, subject: tplSubject, body: tplBody } : t)),
      );
      setTplSaved('Saved');
    } else {
      setTplSaved(r.error || 'Save failed');
    }
    setSavingTpl(false);
  };

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

      {templates.length > 0 && (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-black text-white">Automatic emails</h2>
            <span
              className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
                tplSubject.trim() && tplBody.trim()
                  ? 'text-emerald-400 bg-emerald-500/15'
                  : 'text-amber-400 bg-amber-500/15'
              }`}
            >
              {tplSubject.trim() && tplBody.trim() ? 'Active' : 'Nothing will send'}
            </span>
          </div>

          <select
            value={selectedId}
            onChange={(e) => pickTemplate(e.target.value)}
            className="w-full px-3 py-2 mb-3 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-[#c0392f]/40"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#151515]">{t.label}</option>
            ))}
          </select>

          <div className="space-y-2.5">
            <input
              value={tplSubject}
              onChange={(e) => setTplSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40"
            />
            <textarea
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="Message"
              rows={14}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#c0392f]/40 resize-y font-mono leading-relaxed"
            />
            {!!selected?.vars.length && (
              <p className="text-[11px] text-gray-500">
                Placeholders: {selected.vars.map((v) => `{{${v}}}`).join('  ')}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveTemplate}
                disabled={savingTpl}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#c0392f] text-white hover:bg-[#a83227] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {savingTpl ? 'Saving…' : 'Save template'}
              </button>
              {tplSaved && (
                <span className={`text-xs font-semibold ${tplSaved === 'Saved' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tplSaved}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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
