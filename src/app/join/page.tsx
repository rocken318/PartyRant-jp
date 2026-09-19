'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { BRAND } from '@/app/brand';

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
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      {/* Black top bar */}
      <div className="bg-pr-dark px-4 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full border-[2px] border-white/30 hover:border-white transition-colors touch-manipulation"
          aria-label={t('back')}
        >
          ←
        </Link>
        <span
          className="text-pr-pink text-3xl tracking-wide"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {BRAND.name}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6">
        <h1
          className="text-pr-dark text-5xl tracking-tight"
          style={{ fontFamily: 'var(--font-bebas)' }}
        >
          {t('title')}
        </h1>

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
          className="w-full text-center rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] px-4 py-4 tracking-[0.3em] focus:outline-none focus:shadow-[0_0_0_2px_rgba(207,58,46,.5)] transition-shadow duration-75 text-pr-pink placeholder-gray-300 bg-white"
          style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', lineHeight: 1.2 }}
        />

        {error && (
          <p className="text-red-500 text-sm font-bold text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={loading}
          className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[0_10px_40px_rgba(0,0,0,.5)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {loading ? t('joining') : t('joinButton')}
        </button>

        <p className="text-gray-400 text-sm text-center">
          {t('scanHint')}
        </p>
      </div>
    </main>
  );
}
