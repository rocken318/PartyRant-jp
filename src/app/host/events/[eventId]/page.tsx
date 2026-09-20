'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Game, Event } from '@/types/domain';

// 墨基調のステータスバッジ（線のみ・朱/金/ミストで状態を表現）
const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft:    { bg: 'transparent', text: '#7d7871', label: 'DRAFT' },
  lobby:    { bg: 'transparent', text: '#b8935a', label: 'LOBBY' },
  question: { bg: 'transparent', text: '#cf3a2e', label: 'LIVE' },
  reveal:   { bg: 'transparent', text: '#cf3a2e', label: 'LIVE' },
  ended:    { bg: 'transparent', text: '#7d7871', label: 'ENDED' },
};

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
    <main className="kg-page kg-grain flex min-h-screen items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#cf3a2e] border-t-transparent" />
    </main>
  );

  return (
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="kg-wrap relative z-[2] flex min-h-screen flex-col pb-10">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 pt-8">
          <Link
            href="/host"
            aria-label="←"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/80 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)] touch-manipulation"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
          <div className="min-w-0">
            <span className="kg-eyebrow">Event</span>
            <p className="kg-h mt-1 truncate text-[1.4rem] leading-tight">{event?.name ?? t('event')}</p>
            <p className="mt-0.5 text-[0.7rem] text-[#7d7871]">{t('gameCount', { n: games.length })}</p>
          </div>
        </header>

        <div className="mt-8 flex flex-1 flex-col gap-5">
          <Link href={`/host/events/${eventId}/games/new`}
            className="flex h-[56px] items-center justify-center gap-2 bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 hover:bg-[#d8483c] active:bg-[#a12417] touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', boxShadow: '0 14px 40px rgba(207,58,46,.24)' }}>
            <span>{t('addGame')}</span>
            <span aria-hidden>→</span>
          </Link>

          <div className="grid grid-cols-3 gap-2">
            {(['all', 'live', 'self_paced'] as Tab[]).map(tabKey => {
              const active = tab === tabKey;
              return (
                <button key={tabKey} onClick={() => setTab(tabKey)}
                  className={`min-h-[44px] text-[0.8rem] border transition-colors duration-300 touch-manipulation ${active ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)] hover:border-[rgba(236,231,223,.4)]'}`}
                  style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}>
                  {tabKey === 'all' ? t('tabAll') : tabKey === 'live' ? t('tabLive') : t('tabSelfPaced')}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#7d7871]">{t('noGames')}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(game => {
                const badge = STATUS_BADGE[game.status] ?? STATUS_BADGE.draft;
                return (
                  <button key={game.id}
                    onClick={() => router.push(`/host/events/${eventId}/games/${game.id}`)}
                    className="group kg-card flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors duration-300 hover:border-[rgba(207,58,46,.5)] touch-manipulation">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-[0.72rem] text-[#b8935a]" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
                        <span className="text-[0.66rem] uppercase text-[#7d7871]" style={{ letterSpacing: '0.16em' }}>
                          {game.mode} · {game.gameMode === 'self_paced' ? t('selfPacedLabel') : t('liveLabel')}
                        </span>
                      </div>
                      <span className="kg-h truncate text-[1rem]">{game.title}</span>
                      <span className="text-[0.68rem] text-[#7d7871]">{t('questionCount', { n: game.questions.length })}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="border px-2 py-1 text-[0.62rem]" style={{ background: badge.bg, color: badge.text, borderColor: badge.text + '66', letterSpacing: '0.1em', fontFamily: 'var(--font-bebas)' }}>
                        {badge.label}
                      </span>
                      <span aria-hidden className="text-[#7d7871] transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
