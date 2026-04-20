'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@supabase/ssr';
import type { Event } from '@/types/domain';

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
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <div className="bg-pr-pink px-5 py-4 flex items-center justify-between rounded-b-[20px]">
        <span className="text-white tracking-wider text-3xl" style={{ fontFamily: 'var(--font-bebas)' }}>
          PartyRant
        </span>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-white/80 text-xs truncate max-w-[160px]">{userEmail}</span>
          <button onClick={handleLogout} className="text-white/70 text-xs underline font-bold touch-manipulation">
            {t('logout')}
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-pr-dark text-3xl" style={{ fontFamily: 'var(--font-bebas)' }}>{t('myEvents')}</h2>
          <button onClick={() => setShowCreate(!showCreate)}
            className="bg-pr-pink text-white font-bold text-sm px-4 h-10 rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}>
            {t('newEvent')}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateEvent} className="flex gap-2">
            <input autoFocus type="text" maxLength={80} placeholder={t('eventNamePlaceholder')}
              value={newEventName} onChange={e => setNewEventName(e.target.value)}
              className="flex-1 h-12 px-3 text-base border-[3px] border-pr-dark shadow-[3px_3px_0_#111] rounded-[6px] focus:outline-none"
              style={{ fontFamily: 'var(--font-dm)' }} />
            <button type="submit" disabled={creating}
              className="h-12 px-4 bg-pr-pink text-white font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] disabled:opacity-50 touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)' }}>
              {creating ? '...' : t('create')}
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="text-5xl">🎉</span>
            <p className="font-bold text-gray-500">{t('noEvents')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {events.map(event => (
              <button key={event.id} onClick={() => router.push(`/host/events/${event.id}`)}
                className="flex flex-col items-start gap-2 p-4 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation text-left">
                <span className="font-bold text-pr-dark text-sm leading-tight line-clamp-2" style={{ fontFamily: 'var(--font-dm)' }}>
                  {event.name}
                </span>
                <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleDateString('ja-JP')}</span>
                <span className="w-full mt-auto bg-pr-pink text-white text-xs font-bold text-center py-1.5 rounded-[4px] border-[2px] border-pr-dark">
                  {t('open')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
