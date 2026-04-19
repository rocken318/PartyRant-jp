'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';

const SCENE_META: Record<string, { icon: string; color: string }> = {
  '結婚式':     { icon: '💍', color: '#FF0080' },
  '合コン':     { icon: '💕', color: '#FF6B9D' },
  'キャバクラ': { icon: '🥂', color: '#FFD600' },
  '会社飲み会': { icon: '🏢', color: '#3B82F6' },
  'ホームパーティー': { icon: '🏠', color: '#00C472' },
  'サークル':   { icon: '🎓', color: '#8B5CF6' },
  '居酒屋':     { icon: '🍺', color: '#F97316' },
};

const MODE_LABEL: Record<string, string> = {
  trivia:  '🧠 クイズ',
  polling: '📊 アンケート',
};

const GAME_MODE_LABEL: Record<string, string> = {
  live:       'ライブ',
  self_paced: 'マイペース',
};

export default function PresetsPage() {
  const t = useTranslations('presets');
  const router = useRouter();
  const [presets, setPresets] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.ok ? r.json() : [])
      .then((data: Game[]) => { setPresets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const scenes = Array.from(new Set(presets.map(p => p.scene).filter(Boolean))) as string[];
  const filtered = selectedScene
    ? presets.filter(p => p.scene === selectedScene)
    : presets;

  async function handleStart(presetId: string) {
    setStarting(presetId);
    try {
      const res = await fetch(`/api/presets/${presetId}/start`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const game = await res.json() as Game;
      router.push(`/play/${game.id}`);
    } catch {
      setStarting(null);
    }
  }

  return (
    <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
      {/* Header */}
      <div className="bg-pr-dark px-4 py-4 flex items-center gap-4">
        <Link href="/"
          className="text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full border-[2px] border-white/30 hover:border-white transition-colors touch-manipulation">
          ←
        </Link>
        <div>
          <span className="text-pr-pink text-3xl tracking-wide" style={{ fontFamily: 'var(--font-bebas)' }}>
            {t('title')}
          </span>
          <p className="text-gray-400 text-xs font-bold">{t('subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : presets.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="text-5xl">🎮</span>
            <p className="font-bold text-gray-500">{t('empty')}</p>
          </div>
        ) : (
          <>
            {/* Scene filter */}
            {scenes.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                <button
                  onClick={() => setSelectedScene(null)}
                  className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] border-pr-dark touch-manipulation transition-colors ${!selectedScene ? 'bg-pr-dark text-white' : 'bg-white text-pr-dark'}`}
                  style={{ fontFamily: 'var(--font-dm)' }}>
                  {t('filterAll')}
                </button>
                {scenes.map(scene => {
                  const meta = SCENE_META[scene] ?? { icon: '🎉', color: '#FF0080' };
                  return (
                    <button key={scene}
                      onClick={() => setSelectedScene(scene === selectedScene ? null : scene)}
                      className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] border-pr-dark touch-manipulation transition-colors ${selectedScene === scene ? 'bg-pr-dark text-white' : 'bg-white text-pr-dark'}`}
                      style={{ fontFamily: 'var(--font-dm)' }}>
                      {meta.icon} {scene}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preset cards */}
            <div className="flex flex-col gap-3">
              {filtered.map(preset => {
                const meta = SCENE_META[preset.scene ?? ''] ?? { icon: '🎉', color: '#FF0080' };
                const isStarting = starting === preset.id;
                return (
                  <div key={preset.id}
                    className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
                    {/* Card header */}
                    <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: meta.color + '18' }}>
                      <span className="text-2xl">{meta.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-pr-dark text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                          {preset.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-gray-400">{preset.scene}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs font-bold" style={{ color: meta.color }}>{MODE_LABEL[preset.mode]}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs font-bold text-gray-400">{GAME_MODE_LABEL[preset.gameMode]}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-400 flex-shrink-0">
                        {preset.questions.length}{t('questionCount')}
                      </span>
                    </div>

                    {/* Description */}
                    {preset.description && (
                      <p className="px-4 pt-2 pb-1 text-xs text-gray-500">{preset.description}</p>
                    )}

                    {/* Start button */}
                    <div className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleStart(preset.id)}
                        disabled={isStarting || starting !== null}
                        className="w-full h-12 bg-pr-pink text-white font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
                        style={{ fontFamily: 'var(--font-dm)' }}>
                        {isStarting ? t('starting') : t('startButton')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
