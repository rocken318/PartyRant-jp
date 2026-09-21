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

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
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
            className="flex h-10 w-10 items-center justify-center border border-[rgba(var(--kg-paper-rgb),.16)] text-[var(--kg-paper)]/80 transition-colors duration-300 hover:border-[rgba(var(--kg-paper-rgb),.4)]"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-center pb-16">
          <div className="flex flex-col items-center text-center">
            <span className="kg-eyebrow">Host Login</span>
            <h1
              className="mt-6 text-[2.4rem] font-medium leading-[1.15] text-[var(--kg-paper)]"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.4)' }}
            >
              {t('loginTitle')}
            </h1>
            <span aria-hidden className="mt-7 block h-px w-12 bg-[var(--kg-accent)]" />
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
                className="kg-input"
                style={{ fontFamily: 'var(--font-dm)' }}
              />
            </div>
            {error && (
              <p className="text-[0.8rem] text-[var(--kg-paper)] bg-[var(--kg-accent-deep)]/30 border border-[var(--kg-accent)]/40 px-3 py-2" style={{ letterSpacing: '0.02em' }}>
                {error}
              </p>
            )}
            <button
              type="submit" disabled={loading}
              className="kg-btn kg-btn--primary mt-2"
            >
              <span>{loading ? t('loggingIn') : t('loginButton')}</span>
              {!loading && <span aria-hidden>→</span>}
            </button>
            <p className="mt-4 text-center text-[0.78rem] text-[var(--kg-mist)]" style={{ letterSpacing: '0.04em' }}>
              {t('noAccount')}{' '}
              <Link href="/auth/signup" className="text-[var(--kg-gold)] underline decoration-[var(--kg-gold)]/40 underline-offset-4 transition-colors hover:text-[var(--kg-accent)]">{t('signUp')}</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
