'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@supabase/ssr';
import type { Event } from '@/types/domain';
import { BRAND } from '@/app/brand';

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default function DashboardPage() {
  const t = useTranslations('hostDashboard');
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    const res = await fetch('/api/events');
    if (res.ok) setEvents(await res.json() as Event[]);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    init();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEventName.trim() }),
    });
    setCreating(false);
    if (res.ok) {
      const event = await res.json() as Event;
      setNewEventName('');
      setShowCreate(false);
      router.push(`/host/events/${event.id}`);
    }
  };

  return (
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="kg-wrap relative z-[2] flex min-h-screen flex-col pb-10">
        {/* ヘッダー */}
        <header className="flex items-start justify-between gap-4 pt-8">
          <div className="min-w-0">
            <span className="kg-eyebrow">NEWCLUB Kingyo</span>
            <p className="kg-h mt-1 text-[1.5rem] leading-tight">{BRAND.name}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
            <span className="max-w-[160px] truncate text-[0.68rem] text-[#7d7871]">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-[0.7rem] text-[#b8935a] underline decoration-[#b8935a]/40 underline-offset-4 transition-colors hover:text-[#cf3a2e] touch-manipulation"
              style={{ letterSpacing: '0.04em' }}
            >
              {t('logout')}
            </button>
          </div>
        </header>

        <span aria-hidden className="kg-rule mt-6" />

        <div className="mt-8 flex flex-1 flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="kg-h text-[1.2rem]">{t('myEvents')}</h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="min-h-[44px] px-4 text-[0.82rem] border border-[rgba(184,147,90,.45)] text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5 touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
            >
              {t('newEvent')}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreateEvent} className="flex gap-2">
              <input autoFocus type="text" maxLength={80} placeholder={t('eventNamePlaceholder')}
                value={newEventName} onChange={e => setNewEventName(e.target.value)}
                className="kg-input flex-1"
                style={{ fontFamily: 'var(--font-dm)' }} />
              <button type="submit" disabled={creating}
                className="shrink-0 min-h-[48px] px-5 bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 hover:bg-[#d8483c] active:bg-[#a12417] disabled:opacity-50 touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em' }}>
                {creating ? '...' : t('create')}
              </button>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#cf3a2e] border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span aria-hidden className="text-lg text-[#b8935a]">✦</span>
              <p className="text-[#7d7871]">{t('noEvents')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {events.map(event => (
                <button key={event.id} onClick={() => router.push(`/host/events/${event.id}`)}
                  className="group kg-card flex flex-col items-start gap-2 p-4 text-left transition-colors duration-300 hover:border-[rgba(207,58,46,.5)] touch-manipulation">
                  <span className="kg-h line-clamp-2 text-[0.92rem] leading-snug">
                    {event.name}
                  </span>
                  <span className="text-[0.68rem] text-[#7d7871]">{new Date(event.createdAt).toLocaleDateString('ja-JP')}</span>
                  <span className="mt-auto flex w-full items-center justify-center gap-2 border border-[rgba(236,231,223,.16)] py-1.5 text-[0.72rem] text-[#ece7df]/85 transition-colors duration-300 group-hover:border-[rgba(207,58,46,.5)] group-hover:text-[#cf3a2e]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}>
                    {t('open')} <span aria-hidden>→</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
