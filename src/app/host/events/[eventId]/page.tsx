'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Game, Event } from '@/types/domain';

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft:    { bg: '#17171b', text: '#b9b4ac', label: 'DRAFT' },
  lobby:    { bg: '#fefce8', text: '#ca8a04', label: 'LOBBY' },
  question: { bg: '#dcfce7', text: '#16a34a', label: 'LIVE' },
  reveal:   { bg: '#dcfce7', text: '#16a34a', label: 'LIVE' },
  ended:    { bg: '#f3f4f6', text: '#6b7280', label: 'ENDED' },
};

const TYPE_ICON: Record<string, string> = { trivia: '🧠', polling: '📊' };
type Tab = 'all' | 'live' | 'self_paced';

export default function EventDetailPage() {
  const t = useTranslations('eventDetail');
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    const load = async () => {
      const [evRes, gamesRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/games`),
      ]);
      if (evRes.ok) setEvent(await evRes.json() as Event);
      if (gamesRes.ok) setGames(await gamesRes.json() as Game[]);
      setLoading(false);
    };
    load();
  }, [eventId]);

  const filtered = games.filter(g =>
    tab === 'all' ? true : tab === 'live' ? g.gameMode === 'live' : g.gameMode === 'self_paced'
  );

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      <div className="bg-pr-pink px-4 py-4 flex items-center gap-3 rounded-b-[20px]">
        <Link href="/host" className="text-white text-xl w-9 h-9 flex items-center justify-center rounded-full border-[2px] border-white/30 hover:border-white touch-manipulation">←</Link>
        <div>
          <h1 className="text-white text-2xl leading-none" style={{ fontFamily: 'var(--font-bebas)' }}>{event?.name ?? t('event')}</h1>
          <p className="text-white/70 text-xs font-bold">{t('gameCount', { n: games.length })}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
        <Link href={`/host/events/${eventId}/games/new`}
          className="w-full h-14 bg-pr-pink text-white flex items-center justify-center font-bold text-base rounded-[6px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
          style={{ fontFamily: 'var(--font-dm)' }}>
          {t('addGame')}
        </Link>

        <div className="grid grid-cols-3 gap-2">
          {(['all', 'live', 'self_paced'] as Tab[]).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`h-9 rounded-[6px] text-xs font-bold border-[2px] border-pr-dark touch-manipulation transition-colors ${tab === tabKey ? 'bg-pr-dark text-white' : 'bg-white text-pr-dark'}`}
              style={{ fontFamily: 'var(--font-dm)' }}>
              {tabKey === 'all' ? t('tabAll') : tabKey === 'live' ? t('tabLive') : t('tabSelfPaced')}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-bold">{t('noGames')}</div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(game => {
              const badge = STATUS_BADGE[game.status] ?? STATUS_BADGE.draft;
              return (
                <button key={game.id}
                  onClick={() => router.push(`/host/events/${eventId}/games/${game.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation text-left">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{TYPE_ICON[game.mode]}</span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {game.mode} · {game.gameMode === 'self_paced' ? t('selfPacedLabel') : t('liveLabel')}
                      </span>
                    </div>
                    <span className="font-bold text-pr-dark text-base" style={{ fontFamily: 'var(--font-dm)' }}>{game.title}</span>
                    <span className="text-xs text-gray-400">{t('questionCount', { n: game.questions.length })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-[4px] border" style={{ background: badge.bg, color: badge.text, borderColor: badge.text }}>
                      {badge.label}
                    </span>
                    <span className="text-lg text-pr-dark">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
