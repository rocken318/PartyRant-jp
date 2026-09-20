'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function JoinPage() {
  const t = useTranslations('join');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError(t('errorEmpty'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/code/${trimmed}`);
      if (res.ok) {
        router.push(`/join/${trimmed}`);
      } else if (res.status === 404) {
        setError(t('errorNotFound'));
      } else {
        setError(t('errorGeneral'));
      }
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0b] text-[#ece7df]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(207,58,46,.28) 0%, rgba(207,58,46,.06) 38%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-[460px] flex-col px-8">
        {/* Top bar */}
        <div className="flex items-center pt-8">
          <Link
            href="/"
            aria-label={t('back')}
            className="flex h-10 w-10 items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/80 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)]"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="kg-eyebrow">Join</span>
          <h1
            className="mt-6 text-[2.6rem] font-medium leading-[1.15] text-[#ece7df]"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em', textShadow: '0 0 48px rgba(207,58,46,.4)' }}
          >
            {t('title')}
          </h1>
          <span aria-hidden className="mt-7 block h-px w-12 bg-[#cf3a2e]" />

          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={6}
            placeholder={t('placeholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            autoFocus
            className="mt-10 w-full bg-[#111114] border border-[rgba(236,231,223,.16)] text-center text-[#cf3a2e] placeholder-[#7d7871] transition-colors duration-300 focus:outline-none focus:border-[#cf3a2e]"
            style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.8rem', lineHeight: 1.2, letterSpacing: '0.3em', textIndent: '0.3em', padding: '1.1rem 1rem' }}
          />

          {error && (
            <p className="mt-4 text-sm text-[#cf3a2e]" style={{ letterSpacing: '0.04em' }}>{error}</p>
          )}

          <button
            type="button"
            onClick={handleJoin}
            disabled={loading}
            className="kg-btn kg-btn--primary mt-8"
          >
            <span>{loading ? t('joining') : t('joinButton')}</span>
            {!loading && <span aria-hidden>→</span>}
          </button>

          <p className="mt-8 text-[0.74rem] text-[#7d7871]" style={{ letterSpacing: '0.1em' }}>
            {t('scanHint')}
          </p>
        </div>
      </div>
    </main>
  );
}
