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
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <div className="bg-pr-pink px-6 pt-16 pb-20 flex flex-col items-center gap-2 rounded-b-[40px]">
        <h1 className="text-white tracking-wider" style={{ fontFamily: 'var(--font-bebas)', fontSize: '4rem', lineHeight: 1 }}>
          {t('loginTitle')}
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-10">
        <div className="flex flex-col gap-2">
          <label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('email')}</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full h-14 text-base px-4 border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] rounded-[6px] focus:outline-none focus:shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-shadow"
            style={{ fontFamily: 'var(--font-dm)' }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('password')}</label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            className="w-full h-14 text-base px-4 border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] rounded-[6px] focus:outline-none focus:shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-shadow"
            style={{ fontFamily: 'var(--font-dm)' }}
          />
        </div>
        {error && <p className="text-red-500 font-bold text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[0_10px_40px_rgba(0,0,0,.5)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}
        >
          {loading ? t('loggingIn') : t('loginButton')}
        </button>
        <p className="text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link href="/auth/signup" className="text-pr-pink font-bold underline">{t('signUp')}</Link>
        </p>
      </form>
    </main>
  );
}
