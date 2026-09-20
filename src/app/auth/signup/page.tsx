'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@supabase/ssr';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function SignupPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('パスワードは6文字以上で入力してください。'); return; }
    setLoading(true);
    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    router.push('/host');
    router.refresh();
  };

  return (
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="kg-wrap relative z-[2] flex min-h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center pt-8">
          <Link
            href="/"
            aria-label="←"
            className="flex h-10 w-10 items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/80 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)]"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-center pb-16">
          <div className="flex flex-col items-center text-center">
            <span className="kg-eyebrow">Host Signup</span>
            <h1
              className="mt-6 text-[2.4rem] font-medium leading-[1.15] text-[#ece7df]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em', textShadow: '0 0 48px rgba(207,58,46,.4)' }}
            >
              {t('signupTitle')}
            </h1>
            <span aria-hidden className="mt-7 block h-px w-12 bg-[#cf3a2e]" />
          </div>

          <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="kg-label">{t('email')}</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="kg-input"
                style={{ fontFamily: 'var(--font-dm)' }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="kg-label">{t('password')}</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="kg-input"
                style={{ fontFamily: 'var(--font-dm)' }}
              />
            </div>
            {error && (
              <p className="text-[0.8rem] text-[#ece7df] bg-[#a12417]/30 border border-[#cf3a2e]/40 px-3 py-2" style={{ letterSpacing: '0.02em' }}>
                {error}
              </p>
            )}
            <button
              type="submit" disabled={loading}
              className="kg-btn kg-btn--primary mt-2"
            >
              <span>{loading ? t('signingUp') : t('signupButton')}</span>
              {!loading && <span aria-hidden>→</span>}
            </button>
            <p className="mt-4 text-center text-[0.78rem] text-[#7d7871]" style={{ letterSpacing: '0.04em' }}>
              {t('hasAccount')}{' '}
              <Link href="/auth/login" className="text-[#b8935a] underline decoration-[#b8935a]/40 underline-offset-4 transition-colors hover:text-[#cf3a2e]">{t('login')}</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
