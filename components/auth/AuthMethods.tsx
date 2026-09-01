'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { registerWithEmail } from '@/lib/actions/authRegister';
import { loginWithEmail } from '@/lib/actions/authLogin';
import { requestPasswordReset } from '@/lib/actions/passwordReset';

type Tab = 'join' | 'signin';
type SignInHelp = null | 'password';

function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  inputClass,
  isAinsfwTheme,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  inputClass: string;
  isAinsfwTheme: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors ${
          isAinsfwTheme ? 'text-gray-400 hover:text-gray-600' : 'text-white/40 hover:text-white/70'
        }`}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function OrDivider({ isAinsfwTheme }: { isAinsfwTheme: boolean }) {
  const lineClass = isAinsfwTheme ? 'bg-black/10' : 'bg-white/15';
  const textClass = isAinsfwTheme ? 'text-black/35' : 'text-white/40';
  return (
    <div className="flex items-center gap-2 my-0.5">
      <div className={`flex-1 h-px ${lineClass}`} />
      <span className={`text-[10px] font-medium ${textClass}`}>or</span>
      <div className={`flex-1 h-px ${lineClass}`} />
    </div>
  );
}

export default function AuthMethods({
  tab,
  googleHref,
  isAinsfwTheme,
  onAuthSuccess,
  onError,
}: {
  tab: Tab;
  googleHref: string;
  isAinsfwTheme: boolean;
  onAuthSuccess: (data: {
    token: string;
    username: string;
    isAdmin: boolean | string;
    firstName?: string | null;
    photoUrl?: string | null;
    isNewUser?: boolean;
  }) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatesOptIn, setUpdatesOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [telegramReady, setTelegramReady] = useState(false);
  const [signInHelp, setSignInHelp] = useState<SignInHelp>(null);
  const [helpValue, setHelpValue] = useState('');
  const [helpMessage, setHelpMessage] = useState('');

  const inputClass = isAinsfwTheme
    ? 'w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/15 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-[#22c55e]'
    : 'w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#00AFF0]';

  const btnClass = isAinsfwTheme
    ? 'w-full py-2.5 rounded-lg bg-[#22c55e] text-black font-bold text-sm hover:bg-[#1db954] transition-all disabled:opacity-50'
    : 'w-full py-2.5 rounded-lg bg-[#00AFF0] text-white font-bold text-sm hover:bg-[#0099d6] transition-all disabled:opacity-50';

  const googleBtnClass =
    'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white border border-white/20 text-gray-900 font-bold text-sm hover:bg-gray-100 transition-all shadow-sm';

  useEffect(() => {
    (window as any).onTelegramAuth = async function (user: any) {
      if (!user || !user.id || !user.hash) return;
      setLoading(true);
      onError('');
      try {
        const res = await axios.post('/api/auth/telegram', user);
        if (!res.data?.token) return;
        onAuthSuccess({ ...res.data, isNewUser: !!res.data.isNewUser });
      } catch (err: any) {
        onError(err.response?.data?.message || 'Telegram login failed');
      } finally {
        setLoading(false);
      }
    };
  }, [onAuthSuccess, onError]);

  useEffect(() => {
    if (tab !== 'signin') {
      setSignInHelp(null);
      setHelpValue('');
      setHelpMessage('');
    }
  }, [tab]);

  useEffect(() => {
    if (signInHelp) {
      setTelegramReady(false);
      return;
    }
    setTelegramReady(false);
    const t = setTimeout(() => setTelegramReady(true), 50);
    return () => clearTimeout(t);
  }, [tab, signInHelp]);

  useEffect(() => {
    if (signInHelp || !telegramReady) return;
    const container = document.getElementById('telegram-login-container');
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', 'erogramvipbot');
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
  }, [tab, telegramReady, signInHelp]);

  const handleHelpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');
    setHelpMessage('');
    setLoading(true);
    try {
      const res = await requestPasswordReset(helpValue);
      if (!res.ok) {
        onError(res.message);
        return;
      }
      setHelpMessage(res.message);
    } finally {
      setLoading(false);
    }
  };

  const linkClass = isAinsfwTheme
    ? 'text-[#16a34a] hover:underline'
    : 'text-[#0088c2] hover:underline';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError('');
    setLoading(true);
    try {
      if (tab === 'join') {
        if (password !== confirmPassword) {
          onError('Passwords do not match.');
          return;
        }
        const res = await registerWithEmail(email, password, updatesOptIn);
        if (!res.ok) {
          onError(res.error);
          return;
        }
        onAuthSuccess({ ...res, isNewUser: true });
      } else {
        const res = await loginWithEmail(email, password);
        if (!res.ok) {
          onError(res.error);
          return;
        }
        onAuthSuccess({ ...res, isNewUser: false });
      }
    } catch (err: any) {
      onError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {tab === 'join' ? (
        <>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Password"
                autoComplete="new-password"
                inputClass={inputClass}
                isAinsfwTheme={isAinsfwTheme}
              />
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Confirm"
                autoComplete="new-password"
                inputClass={inputClass}
                isAinsfwTheme={isAinsfwTheme}
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={updatesOptIn}
                onChange={(e) => setUpdatesOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-black/25 accent-[#00AFF0]"
              />
              <span className={`text-[11px] leading-snug ${isAinsfwTheme ? 'text-black/55' : 'text-white/60'}`}>
                Receive updates based on your interest
              </span>
            </label>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Please wait…' : 'Create account'}
            </button>
          </form>
          <OrDivider isAinsfwTheme={isAinsfwTheme} />
          <a href={googleHref} className={googleBtnClass}>
            <GoogleIcon />
            Google
          </a>
          {telegramReady && (
            <TelegramLoginSlot isAinsfwTheme={isAinsfwTheme} />
          )}
        </>
      ) : signInHelp ? (
        <>
          <form onSubmit={handleHelpSubmit} className="flex flex-col gap-2">
            <p className={`text-xs leading-snug ${isAinsfwTheme ? 'text-black/55' : 'text-white/60'}`}>
              Enter your email and we will send a link to create a new password.
            </p>
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={helpValue}
              onChange={(e) => setHelpValue(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Please wait…' : 'Send reset link'}
            </button>
          </form>
          {helpMessage ? (
            <p className={`text-xs leading-snug ${isAinsfwTheme ? 'text-green-700' : 'text-green-400'}`}>{helpMessage}</p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setSignInHelp(null);
              setHelpValue('');
              setHelpMessage('');
              onError('');
            }}
            className={`text-xs font-semibold ${linkClass}`}
          >
            Back to sign in
          </button>
        </>
      ) : (
        <>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoComplete="current-password"
              inputClass={inputClass}
              isAinsfwTheme={isAinsfwTheme}
            />
            <div className="text-[11px] font-semibold">
              <button type="button" onClick={() => { setSignInHelp('password'); onError(''); setHelpMessage(''); }} className={linkClass}>
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading} className={btnClass}>
              {loading ? 'Please wait…' : 'Sign in'}
            </button>
          </form>
          <OrDivider isAinsfwTheme={isAinsfwTheme} />
          <a href={googleHref} className={googleBtnClass}>
            <GoogleIcon />
            Google
          </a>
          {telegramReady && (
            <TelegramLoginSlot isAinsfwTheme={isAinsfwTheme} />
          )}
        </>
      )}
    </div>
  );
}

function TelegramLoginSlot({ isAinsfwTheme }: { isAinsfwTheme: boolean }) {
  return (
    <div
      className={`flex justify-center items-center min-h-[40px] rounded-lg py-1 ${
        isAinsfwTheme
          ? 'bg-black/[0.03] border border-black/10'
          : 'bg-white/[0.06] border border-white/10'
      }`}
      id="telegram-login-container"
    />
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
