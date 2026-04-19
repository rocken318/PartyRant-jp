'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';
import PresetPreviewDrawer from '@/components/PresetPreviewDrawer';

const SCENE_META: Record<string, { icon: string; color: string }> = {
  'みんなで':       { icon: '🎉', color: '#8B5CF6' },
  '多数派クイズ':   { icon: '⚔️', color: '#F97316' },
  '結婚式':         { icon: '💍', color: '#FF0080' },
  '合コン':         { icon: '💕', color: '#FF6B9D' },
  'カップル':       { icon: '🫶', color: '#FF4D6D' },
  'ファミリー':     { icon: '👨‍👩‍👧‍👦', color: '#00C472' },
  '会社飲み会':     { icon: '🏢', color: '#3B82F6' },
  'キャバクラ':     { icon: '🥂', color: '#FFD600' },
  'ホームパーティー': { icon: '🏠', color: '#8B5CF6' },
  'サークル':       { icon: '🎓', color: '#F97316' },
  '居酒屋':         { icon: '🍺', color: '#EF4444' },
  '勉強':           { icon: '📚', color: '#10B981' },
  '雑学クイズ':     { icon: '🎓', color: '#6366F1' },
};

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  trivia:  { label: 'クイズ',        icon: '🧠', color: '#3B82F6' },
  polling: { label: '実態調査',     icon: '📊', color: '#FF0080' },
  opinion: { label: '多数派/少数派', icon: '⚔️', color: '#8B5CF6' },
};

const COUNT_OPTIONS = [5, 10, 15] as const;

type SettingsMode =
  | { type: 'opinion'; loseRule: 'minority' | 'majority'; count: number }
  | { type: 'trivia'; count: number; scene: string | null };

export default function PresetsPage() {
  const t = useTranslations('presets');
  const router = useRouter();
  const [presets, setPresets] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [randomStarting, setRandomStarting] = useState<'minority' | 'majority' | null>(null);
  const [settings, setSettings] = useState<SettingsMode | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<Game | null>(null);

  useEffect(() => {
    fetch('/api/presets')
      .then(r => r.ok ? r.json() : [])
      .then((data: Game[]) => { setPresets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const scenes = Array.from(new Set(presets.map(p => p.scene).filter(Boolean))) as string[];

  const triviaScenes = Array.from(
    new Set(presets.filter(p => p.mode === 'trivia').map(p => p.scene).filter(Boolean))
  ) as string[];

  const filtered = presets.filter(p => {
    if (selectedScene && p.scene !== selectedScene) return false;
    if (selectedType && p.mode !== selectedType) return false;
    return true;
  });

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

  async function handleRandom(loseRule: 'minority' | 'majority') {
    const count = (settings?.type === 'opinion' ? settings.count : null) ?? 10;
    setRandomStarting(loseRule);
    try {
      const res = await fetch('/api/opinion/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loseRule, count }),
      });
      if (!res.ok) throw new Error();
      const game = await res.json() as Game;
      router.push(`/play/${game.id}`);
    } catch {
      setRandomStarting(null);
    }
  }

  async function handleRandomTrivia() {
    if (!settings || settings.type !== 'trivia') return;
    setRandomStarting('majority');
    try {
      const res = await fetch('/api/trivia/random', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: settings.count, scene: settings.scene }),
      });
      if (!res.ok) throw new Error();
      const game = await res.json() as Game;
      router.push(`/play/${game.id}`);
    } catch {
      setRandomStarting(null);
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

      <div className="flex-1 px-4 py-5 flex flex-col gap-4">
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
            {/* ── 意見バトルカード ── */}
            <div className="bg-pr-dark rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">⚔️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                    {t('randomOpinionTitle')}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{t('randomOpinionSubtitle')}</p>
                </div>
              </div>

              {/* モード選択ボタン */}
              <div className="grid grid-cols-2 gap-0 border-t-[2px] border-white/10">
                {(['minority', 'majority'] as const).map(rule => (
                  <button
                    key={rule}
                    type="button"
                    onClick={() => {
                      if (settings?.type === 'opinion' && settings.loseRule === rule) {
                        setSettings(null);
                      } else {
                        setSettings({ type: 'opinion', loseRule: rule, count: 10 });
                      }
                    }}
                    disabled={randomStarting !== null || starting !== null}
                    className={[
                      'h-12 font-bold text-sm touch-manipulation transition-colors disabled:opacity-50',
                      rule === 'minority'
                        ? 'bg-pr-pink text-white border-r-[1px] border-white/10 hover:bg-pr-pink/90'
                        : 'bg-white/10 text-white hover:bg-white/20',
                      settings?.type === 'opinion' && settings.loseRule === rule
                        ? 'ring-2 ring-inset ring-white/40'
                        : '',
                    ].join(' ')}
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >
                    {rule === 'minority' ? t('randomMinority') : t('randomMajority')}
                  </button>
                ))}
              </div>

              {/* 設定パネル（展開） */}
              {settings?.type === 'opinion' && (
                <div className="border-t-[2px] border-white/10 px-4 py-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsCountLabel')}</p>
                    <div className="flex gap-2">
                      {COUNT_OPTIONS.map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSettings({ ...settings, count: n })}
                          className={[
                            'flex-1 h-10 rounded-[6px] text-sm font-bold border-[2px] touch-manipulation transition-colors',
                            settings.count === n
                              ? 'bg-pr-pink text-white border-pr-pink'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
                          ].join(' ')}
                          style={{ fontFamily: 'var(--font-dm)' }}
                        >
                          {n}問
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRandom(settings.loseRule)}
                    disabled={randomStarting !== null || starting !== null}
                    className="w-full h-11 bg-pr-pink text-white font-bold text-sm rounded-[6px] border-[2px] border-white/20 disabled:opacity-50 touch-manipulation hover:bg-pr-pink/90 transition-colors"
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >
                    {randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}
                  </button>
                </div>
              )}
            </div>

            {/* ── 雑学クイズカード ── */}
            <div className="bg-white rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 border-b-[2px] border-pr-dark">
                <span className="text-2xl">🧠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-pr-dark font-bold text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                    {t('randomTriviaTitle')}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">{t('randomTriviaSubtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(s => s?.type === 'trivia' ? null : { type: 'trivia', count: 10, scene: null })}
                  disabled={randomStarting !== null || starting !== null}
                  className="flex-shrink-0 h-10 px-4 bg-pr-dark text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark disabled:opacity-50 touch-manipulation hover:bg-pr-dark/90 transition-colors"
                  style={{ fontFamily: 'var(--font-dm)' }}
                >
                  {t('randomTriviaStart')}
                </button>
              </div>

              {settings?.type === 'trivia' && (
                <div className="px-4 py-3 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsCountLabel')}</p>
                    <div className="flex gap-2">
                      {COUNT_OPTIONS.map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSettings({ ...settings, count: n })}
                          className={[
                            'flex-1 h-10 rounded-[6px] text-sm font-bold border-[2px] touch-manipulation transition-colors',
                            settings.count === n
                              ? 'bg-pr-dark text-white border-pr-dark'
                              : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50',
                          ].join(' ')}
                          style={{ fontFamily: 'var(--font-dm)' }}
                        >
                          {n}問
                        </button>
                      ))}
                    </div>
                  </div>

                  {triviaScenes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('settingsSceneLabel')}</p>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, scene: null })}
                          className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${settings.scene === null ? 'bg-pr-dark text-white border-pr-dark' : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50'}`}
                          style={{ fontFamily: 'var(--font-dm)' }}
                        >
                          {t('settingsSceneAll')}
                        </button>
                        {triviaScenes.map(scene => {
                          const active = settings.scene === scene;
                          const meta = SCENE_META[scene] ?? { icon: '🎉', color: '#FF0080' };
                          return (
                            <button
                              key={scene}
                              type="button"
                              onClick={() => setSettings({ ...settings, scene: active ? null : scene })}
                              className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${active ? 'text-white' : 'bg-white text-pr-dark border-pr-dark hover:bg-gray-50'}`}
                              style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                            >
                              {meta.icon} {scene}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRandomTrivia}
                    disabled={randomStarting !== null || starting !== null}
                    className="w-full h-11 bg-pr-pink text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark shadow-[2px_2px_0_#111] disabled:opacity-50 touch-manipulation hover:bg-pr-pink/90 transition-colors"
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >
                    {randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}
                  </button>
                </div>
              )}
            </div>

            {/* ── シーンフィルター ── */}
            {scenes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">{t('filterSceneLabel')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                  <button
                    onClick={() => setSelectedScene(null)}
                    className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] border-pr-dark touch-manipulation transition-colors ${!selectedScene ? 'bg-pr-dark text-white' : 'bg-white text-pr-dark'}`}
                    style={{ fontFamily: 'var(--font-dm)' }}>
                    {t('filterAll')}
                  </button>
                  {scenes.map(scene => {
                    const meta = SCENE_META[scene] ?? { icon: '🎉', color: '#FF0080' };
                    const active = selectedScene === scene;
                    return (
                      <button key={scene}
                        onClick={() => setSelectedScene(active ? null : scene)}
                        className={`flex-shrink-0 h-9 px-4 rounded-full text-xs font-bold border-[2px] touch-manipulation transition-colors ${active ? 'text-white' : 'bg-white text-pr-dark border-pr-dark'}`}
                        style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                      >
                        {meta.icon} {scene}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── タイプフィルター ── */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-0.5">{t('filterTypeLabel')}</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedType(null)}
                  className={`h-11 rounded-[8px] text-sm font-bold border-[2px] border-pr-dark touch-manipulation transition-colors ${!selectedType ? 'bg-pr-dark text-white shadow-[2px_2px_0_#111]' : 'bg-white text-pr-dark shadow-[3px_3px_0_#111]'}`}
                  style={{ fontFamily: 'var(--font-dm)' }}>
                  {t('filterAll')}
                </button>
                {Object.entries(TYPE_META).map(([key, meta]) => {
                  const active = selectedType === key;
                  return (
                    <button key={key}
                      onClick={() => setSelectedType(active ? null : key)}
                      className={`h-11 rounded-[8px] text-sm font-bold border-[2px] touch-manipulation transition-colors ${active ? 'text-white shadow-[2px_2px_0_#111]' : 'bg-white text-pr-dark border-pr-dark shadow-[3px_3px_0_#111]'}`}
                      style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 件数表示 ── */}
            <p className="text-xs text-gray-400 font-bold">
              {filtered.length}{t('resultCount')}
            </p>

            {/* ── プリセットカード ── */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-bold">{t('noResults')}</div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map(preset => {
                  const sceneMeta = SCENE_META[preset.scene ?? ''] ?? { icon: '🎉', color: '#FF0080' };
                  const typeMeta = TYPE_META[preset.mode];
                  const isStarting = starting === preset.id;
                  return (
                    <div key={preset.id}
                      className="bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] overflow-hidden">

                      {/* カードヘッダー */}
                      <div className="px-4 py-3 flex items-center gap-3"
                        style={{ backgroundColor: sceneMeta.color + '15' }}>
                        <span className="text-2xl">{sceneMeta.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-pr-dark text-base leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                            {preset.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {/* シーンバッジ */}
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: sceneMeta.color + '25', color: sceneMeta.color }}>
                              {sceneMeta.icon} {preset.scene}
                            </span>
                            {/* タイプバッジ */}
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: typeMeta.color + '20', color: typeMeta.color }}>
                              {typeMeta.icon} {typeMeta.label}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-400 flex-shrink-0">
                          {preset.questions.length}{t('questionCount')}
                        </span>
                      </div>

                      {/* 説明文 */}
                      {preset.description && (
                        <p className="px-4 pt-2 pb-1 text-xs text-gray-500 leading-relaxed">
                          {preset.description}
                        </p>
                      )}

                      {/* アクションボタン */}
                      <div className="px-4 py-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPreset(preset)}
                          disabled={isStarting}
                          className="flex-shrink-0 h-12 px-4 bg-white text-pr-dark font-bold text-sm rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
                          style={{ fontFamily: 'var(--font-dm)' }}>
                          {t('previewButton')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStart(preset.id)}
                          disabled={isStarting || starting !== null}
                          className="flex-1 min-w-[80px] h-12 bg-pr-pink text-white font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
                          style={{ fontFamily: 'var(--font-dm)' }}>
                          {isStarting ? t('starting') : t('startButton')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <PresetPreviewDrawer
        preset={previewPreset}
        onClose={() => setPreviewPreset(null)}
      />
    </main>
  );
}
