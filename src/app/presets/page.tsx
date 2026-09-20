'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';
import PresetPreviewDrawer from '@/components/PresetPreviewDrawer';

// シーン別のアクセント色（墨基調の中での差し色）。絵文字は撤去。
const SCENE_META: Record<string, { color: string }> = {
  'みんなで':             { color: '#cf3a2e' },
  '多数派クイズ':         { color: '#b8935a' },
  '究極の二択':           { color: '#cf3a2e' },
  'この中で●●なのは誰だ': { color: '#a12417' },
  'キャスト指名':           { color: '#b8935a' },
  '結婚式':               { color: '#cf3a2e' },
  '合コン':               { color: '#a12417' },
  'カップル':             { color: '#cf3a2e' },
  'ファミリー':           { color: '#b8935a' },
  '会社飲み会':           { color: '#7d7871' },
  'キャバクラ':           { color: '#b8935a' },
  'ホームパーティー':     { color: '#b8935a' },
  'サークル':             { color: '#b8935a' },
  '居酒屋':               { color: '#cf3a2e' },
  '勉強':                 { color: '#7d7871' },
  '雑学クイズ':           { color: '#7d7871' },
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  trivia:  { label: 'クイズ',        color: '#7d7871' },
  polling: { label: '実態調査',     color: '#cf3a2e' },
  opinion: { label: '多数派/少数派', color: '#b8935a' },
};

const COUNT_OPTIONS = [5, 10, 15] as const;

type SettingsMode =
  | { type: 'opinion'; loseRule: 'minority' | 'majority'; count: number }
  | { type: 'trivia'; count: number; scene: string | null };

// セグメント選択ボタン（墨基調・選択時は朱）
function segClass(active: boolean): string {
  return [
    'min-h-[44px] px-3 text-[0.82rem] border transition-colors duration-300 touch-manipulation',
    active
      ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]'
      : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)] hover:border-[rgba(236,231,223,.4)]',
  ].join(' ');
}

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
  const [aiTheme, setAiTheme] = useState('');
  const [aiMode, setAiMode] = useState<'trivia' | 'polling' | 'opinion'>('trivia');
  const [aiLoseRule, setAiLoseRule] = useState<'minority' | 'majority'>('minority');
  const [aiCount, setAiCount] = useState<5 | 10 | 15>(10);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState(false);
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
    await doStart(presetId);
  }

  async function doStart(presetId: string) {
    setStarting(presetId);
    try {
      const res = await fetch(`/api/presets/${presetId}/start`, {
        method: 'POST',
      });
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

  async function handleAiGenerate() {
    if (!aiTheme.trim() || aiGenerating) return;
    setAiGenerating(true);
    setAiError(false);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: aiTheme.trim(),
          mode: aiMode,
          count: aiCount,
          ...(aiMode === 'opinion' ? { loseRule: aiLoseRule } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const game = await res.json() as Game;
      router.push(`/play/${game.id}`);
      setAiGenerating(false);
    } catch {
      setAiError(true);
      setAiGenerating(false);
    }
  }

  return (
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="kg-wrap relative z-[2] flex min-h-screen flex-col pb-10">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 pt-8">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/80 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)]"
            aria-label="←"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
          <div className="min-w-0">
            <span className="kg-eyebrow">Presets</span>
            <p className="kg-h mt-1 text-[1.5rem] leading-tight">{t('title')}</p>
          </div>
        </header>
        <p className="mt-2 text-[0.74rem] text-[#7d7871]" style={{ letterSpacing: '0.08em' }}>{t('subtitle')}</p>

        <div className="mt-8 flex flex-col gap-6">
          {/* ── AIが問題を作る（主役・最上位） ── */}
          <section className="kg-card kg-card--glow relative">
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[#cf3a2e]" />
            <div className="flex items-start justify-between gap-3 px-6 pt-6">
              <div className="min-w-0">
                <span className="kg-eyebrow">AI</span>
                <p className="kg-h mt-1.5 text-[1.28rem] leading-tight">{t('aiTitle')}</p>
                <p className="mt-1 text-[0.74rem] text-[#b8935a]" style={{ letterSpacing: '0.04em' }}>{t('aiSubtitle')}</p>
              </div>
            </div>

            <div className="flex flex-col gap-5 px-6 pb-6 pt-5">
              {/* テーマ入力 */}
              <div className="flex flex-col gap-2">
                <label htmlFor="ai-theme" className="kg-label">{t('aiThemeLabel')}</label>
                <input
                  id="ai-theme"
                  type="text"
                  value={aiTheme}
                  onChange={e => { setAiTheme(e.target.value); setAiError(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
                  placeholder={t('aiThemePlaceholder')}
                  maxLength={50}
                  className="kg-input"
                  style={{ fontFamily: 'var(--font-dm)' }}
                />
              </div>

              {/* タイプ選択 */}
              <div className="flex flex-col gap-2">
                <p className="kg-label">{t('aiTypeLabel')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['trivia',  t('aiTypeTrivia')],
                    ['polling', t('aiTypePolling')],
                    ['opinion', t('aiTypeOpinion')],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAiMode(mode)}
                      className={segClass(aiMode === mode)}
                      style={{ fontFamily: 'var(--font-dm)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 意見バトル：負けルール */}
              {aiMode === 'opinion' && (
                <div className="flex flex-col gap-2">
                  <p className="kg-label">{t('aiLoseRuleLabel')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['minority', t('randomMinority')],
                      ['majority', t('randomMajority')],
                    ] as const).map(([rule, label]) => (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => setAiLoseRule(rule)}
                        className={segClass(aiLoseRule === rule)}
                        style={{ fontFamily: 'var(--font-dm)' }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 問題数 */}
              <div className="flex flex-col gap-2">
                <p className="kg-label">{t('aiCountLabel')}</p>
                <div className="flex gap-2">
                  {COUNT_OPTIONS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAiCount(n)}
                      className={`flex-1 ${segClass(aiCount === n)}`}
                      style={{ fontFamily: 'var(--font-dm)' }}
                    >
                      {n}問
                    </button>
                  ))}
                </div>
              </div>

              {/* エラー表示 */}
              {aiError && (
                <p className="text-[0.78rem] text-[#ece7df] bg-[#a12417]/30 border border-[#cf3a2e]/40 px-3 py-2" style={{ letterSpacing: '0.02em' }}>
                  {t('aiErrorMessage')}
                </p>
              )}

              {/* 生成ボタン */}
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={!aiTheme.trim() || aiGenerating || starting !== null || randomStarting !== null}
                className="kg-btn kg-btn--primary mt-1"
              >
                <span>{aiGenerating ? t('aiGenerating') : t('aiGenerateButton')}</span>
                {!aiGenerating && <span aria-hidden>→</span>}
              </button>
            </div>
          </section>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#cf3a2e] border-t-transparent" />
            </div>
          ) : presets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span aria-hidden className="text-[#b8935a] text-lg">✦</span>
              <p className="text-[#7d7871]">{t('empty')}</p>
            </div>
          ) : (
            <>
              {/* ── 意見バトルカード ── */}
              <div className="kg-card">
                <div className="flex items-center gap-3 px-5 pt-5">
                  <span aria-hidden className="text-[#b8935a] text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
                  <div className="min-w-0">
                    <p className="kg-h text-[1.05rem] leading-tight">{t('randomOpinionTitle')}</p>
                    <p className="mt-0.5 text-[0.72rem] text-[#7d7871]">{t('randomOpinionSubtitle')}</p>
                  </div>
                </div>

                {/* モード選択ボタン */}
                <div className="mt-4 grid grid-cols-2 gap-px bg-[rgba(236,231,223,.1)]">
                  {(['minority', 'majority'] as const).map(rule => {
                    const active = settings?.type === 'opinion' && settings.loseRule === rule;
                    return (
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
                          'min-h-[48px] text-[0.86rem] transition-colors duration-300 touch-manipulation disabled:opacity-50',
                          active
                            ? 'bg-[#cf3a2e] text-[#ece7df]'
                            : 'bg-[#111114] text-[#ece7df]/85 hover:text-[#ece7df]',
                        ].join(' ')}
                        style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
                      >
                        {rule === 'minority' ? t('randomMinority') : t('randomMajority')}
                      </button>
                    );
                  })}
                </div>

                {/* 設定パネル（展開） */}
                {settings?.type === 'opinion' && (
                  <div className="flex flex-col gap-3 px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <p className="kg-label">{t('settingsCountLabel')}</p>
                      <div className="flex gap-2">
                        {COUNT_OPTIONS.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSettings({ ...settings, count: n })}
                            className={`flex-1 ${segClass(settings.count === n)}`}
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
                      className="kg-btn kg-btn--primary"
                    >
                      <span>{randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── 雑学クイズカード ── */}
              <div className="kg-card">
                <div className="flex items-center gap-3 px-5 py-5">
                  <span aria-hidden className="text-[#b8935a] text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
                  <div className="min-w-0 flex-1">
                    <p className="kg-h text-[1.05rem] leading-tight">{t('randomTriviaTitle')}</p>
                    <p className="mt-0.5 text-[0.72rem] text-[#7d7871]">{t('randomTriviaSubtitle')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(s => s?.type === 'trivia' ? null : { type: 'trivia', count: 10, scene: null })}
                    disabled={randomStarting !== null || starting !== null}
                    className="shrink-0 min-h-[44px] px-4 text-[0.82rem] border border-[rgba(184,147,90,.45)] text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5 disabled:opacity-50 touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >
                    {t('randomTriviaStart')}
                  </button>
                </div>

                {settings?.type === 'trivia' && (
                  <div className="flex flex-col gap-3 border-t border-[rgba(236,231,223,.1)] px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <p className="kg-label">{t('settingsCountLabel')}</p>
                      <div className="flex gap-2">
                        {COUNT_OPTIONS.map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setSettings({ ...settings, count: n })}
                            className={`flex-1 ${segClass(settings.count === n)}`}
                            style={{ fontFamily: 'var(--font-dm)' }}
                          >
                            {n}問
                          </button>
                        ))}
                      </div>
                    </div>

                    {triviaScenes.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <p className="kg-label">{t('settingsSceneLabel')}</p>
                        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
                          <button
                            type="button"
                            onClick={() => setSettings({ ...settings, scene: null })}
                            className={`shrink-0 min-h-[36px] px-4 text-[0.74rem] border transition-colors duration-300 touch-manipulation ${settings.scene === null ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)]'}`}
                            style={{ fontFamily: 'var(--font-dm)' }}
                          >
                            {t('settingsSceneAll')}
                          </button>
                          {triviaScenes.map(scene => {
                            const active = settings.scene === scene;
                            const meta = SCENE_META[scene] ?? { color: '#cf3a2e' };
                            return (
                              <button
                                key={scene}
                                type="button"
                                onClick={() => setSettings({ ...settings, scene: active ? null : scene })}
                                className={`shrink-0 min-h-[36px] px-4 text-[0.74rem] border transition-colors duration-300 touch-manipulation ${active ? 'text-[#ece7df]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)]'}`}
                                style={active ? { backgroundColor: meta.color, borderColor: meta.color, fontFamily: 'var(--font-dm)' } : { fontFamily: 'var(--font-dm)' }}
                              >
                                {scene}
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
                      className="kg-btn kg-btn--primary"
                    >
                      <span>{randomStarting !== null ? t('randomStarting') : t('settingsConfirm')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ── シーンフィルター ── */}
              {scenes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="kg-label px-0.5">{t('filterSceneLabel')}</p>
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
                    <button
                      onClick={() => setSelectedScene(null)}
                      className={`shrink-0 min-h-[40px] px-4 text-[0.74rem] border transition-colors duration-300 touch-manipulation ${!selectedScene ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)]'}`}
                      style={{ fontFamily: 'var(--font-dm)' }}>
                      {t('filterAll')}
                    </button>
                    {scenes.map(scene => {
                      const meta = SCENE_META[scene] ?? { color: '#cf3a2e' };
                      const active = selectedScene === scene;
                      return (
                        <button key={scene}
                          onClick={() => setSelectedScene(active ? null : scene)}
                          className={`shrink-0 min-h-[40px] px-4 text-[0.74rem] border transition-colors duration-300 touch-manipulation ${active ? 'text-[#ece7df]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)]'}`}
                          style={active ? { backgroundColor: meta.color, borderColor: meta.color, fontFamily: 'var(--font-dm)' } : { fontFamily: 'var(--font-dm)' }}
                        >
                          {scene}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── タイプフィルター ── */}
              <div className="flex flex-col gap-2">
                <p className="kg-label px-0.5">{t('filterTypeLabel')}</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedType(null)}
                    className={segClass(!selectedType)}
                    style={{ fontFamily: 'var(--font-dm)' }}>
                    {t('filterAll')}
                  </button>
                  {Object.entries(TYPE_META).map(([key, meta]) => {
                    const active = selectedType === key;
                    return (
                      <button key={key}
                        onClick={() => setSelectedType(active ? null : key)}
                        className={active ? 'min-h-[44px] px-3 text-[0.82rem] border text-[#ece7df] transition-colors duration-300 touch-manipulation' : segClass(false)}
                        style={active ? { backgroundColor: meta.color, borderColor: meta.color, fontFamily: 'var(--font-dm)' } : { fontFamily: 'var(--font-dm)' }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 件数表示 ── */}
              <p className="text-[0.72rem] text-[#7d7871]" style={{ letterSpacing: '0.06em' }}>
                {filtered.length}{t('resultCount')}
              </p>

              {/* ── プリセットカード ── */}
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-[#7d7871]">{t('noResults')}</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map(preset => {
                    const sceneMeta = SCENE_META[preset.scene ?? ''] ?? { color: '#cf3a2e' };
                    const typeMeta = TYPE_META[preset.mode] ?? TYPE_META['polling'];
                    const isStarting = starting === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className="group kg-card relative transition-colors duration-300 hover:border-[rgba(207,58,46,.5)]"
                      >
                        {/* カードヘッダー */}
                        <div className="flex items-start gap-3 px-5 pt-5">
                          <span aria-hidden className="mt-1.5 h-8 w-px shrink-0" style={{ backgroundColor: sceneMeta.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="kg-h text-[1.05rem] leading-tight">{preset.title}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-[0.68rem] px-2 py-0.5 border" style={{ borderColor: sceneMeta.color + '66', color: sceneMeta.color }}>
                                {preset.scene}
                              </span>
                              <span className="text-[0.68rem] px-2 py-0.5 border" style={{ borderColor: typeMeta.color + '55', color: typeMeta.color }}>
                                {typeMeta.label}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[0.7rem] text-[#7d7871]">
                            {preset.questions.length}{t('questionCount')}
                          </span>
                        </div>

                        {/* 説明文 */}
                        {preset.description && (
                          <p className="px-5 pt-3 text-[0.76rem] leading-relaxed text-[#b9b4ac]">
                            {preset.description}
                          </p>
                        )}

                        {/* アクションボタン */}
                        <div className="flex gap-2 px-5 py-5">
                          <button
                            type="button"
                            onClick={() => setPreviewPreset(preset)}
                            disabled={isStarting}
                            className="shrink-0 min-h-[48px] px-5 text-[0.84rem] border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)] disabled:opacity-50 touch-manipulation"
                            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}>
                            {t('previewButton')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStart(preset.id)}
                            disabled={isStarting || starting !== null}
                            className="flex-1 min-w-[80px] min-h-[48px] flex items-center justify-center gap-2 bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 hover:bg-[#d8483c] active:bg-[#a12417] disabled:opacity-50 touch-manipulation"
                            style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.1em', boxShadow: '0 14px 40px rgba(207,58,46,.2)' }}>
                            <span>{isStarting ? t('starting') : t('startButton')}</span>
                            {!isStarting && <span aria-hidden>→</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* センキャバ バナー */}
          <a
            href="https://www.sencaba.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-4 kg-card px-5 py-4 transition-colors duration-300 hover:border-[rgba(184,147,90,.45)]"
          >
            <span aria-hidden className="text-[#b8935a] text-sm" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.84rem] text-[#ece7df]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}>
                キャバクラ探しなら <span className="text-[#cf3a2e]">センキャバ</span>
              </p>
              <p className="mt-0.5 text-[0.7rem] text-[#7d7871]">お店を探す・予約する</p>
            </div>
            <span className="shrink-0 text-[0.66rem] text-[#b8935a] border border-[rgba(184,147,90,.45)] px-3 py-1" style={{ letterSpacing: '0.1em' }}>
              DL
            </span>
          </a>
        </div>
      </div>
      <PresetPreviewDrawer
        preset={previewPreset}
        onClose={() => setPreviewPreset(null)}
      />
    </main>
  );
}
