'use client';

import { useState, useRef, useEffect } from 'react';

const REASONS = [
  { value: 'Dead Link', label: 'Dead / Broken Link' },
  { value: 'Wrong Category', label: 'Wrong Category' },
  { value: 'Spam', label: 'Spam' },
  { value: 'Fake Group', label: 'Fake Group' },
  { value: 'Duplicate', label: 'Duplicate' },
  { value: 'Inappropriate Content', label: 'Inappropriate Content' },
  { value: 'Other', label: 'Other...' },
];

interface ReportButtonProps {
  groupId: string;
  groupName: string;
  size?: 'sm' | 'md';
}

export default function ReportButton({ groupId, groupName, size = 'sm' }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pick' | 'custom' | 'done' | 'error'>('pick');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setStep('pick');
        setCustomText('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const submit = async (reason: string, customReason?: string) => {
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ groupId, reason, customReason }),
      });
      if (res.ok) setStep('done');
      else setStep('error');
    } catch {
      setStep('error');
    } finally {
      setSending(false);
    }
  };

  const handlePick = (reason: string) => {
    if (reason === 'Other') {
      setStep('custom');
    } else {
      submit(reason);
    }
  };

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(!open); setStep('pick'); setCustomText(''); }}
        className="flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
        title={`Report ${groupName}`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 top-full mt-1 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: '#141210', border: '1px solid #2e2010', width: 220 }}
          onClick={e => e.stopPropagation()}
        >
          {step === 'pick' && (
            <>
              <div className="px-3 py-2" style={{ borderBottom: '1px solid #2e2010' }}>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#c9973a' }}>Report Issue</p>
              </div>
              <div className="py-1">
                {REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handlePick(r.value)}
                    disabled={sending}
                    className="w-full text-left px-3 py-1.5 text-[12px] text-white/70 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'custom' && (
            <div className="p-3">
              <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: '#c9973a' }}>Describe the issue</p>
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="What's wrong with this group?"
                rows={3}
                className="w-full text-[12px] text-white rounded-lg p-2 outline-none resize-none placeholder:text-[#4a3820]"
                style={{ background: '#0d0c0a', border: '1px solid #2e2010' }}
                autoFocus
              />
              <button
                onClick={() => submit('Other', customText)}
                disabled={sending || !customText.trim()}
                className="w-full mt-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40"
                style={{ background: '#c9973a', color: '#0d0c0a' }}
              >
                {sending ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="p-4 text-center">
              <div className="text-xl mb-1">✓</div>
              <p className="text-[12px] font-bold text-white">Thanks!</p>
              <p className="text-[10px]" style={{ color: '#7a6040' }}>We'll review this shortly</p>
            </div>
          )}

          {step === 'error' && (
            <div className="p-4 text-center">
              <p className="text-[12px] font-bold text-red-400">Failed to submit</p>
              <button onClick={() => setStep('pick')} className="text-[10px] underline mt-1" style={{ color: '#7a6040' }}>Try again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
