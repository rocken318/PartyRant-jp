'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';

const MODE_LABEL: Record<string, string> = {
  trivia:  'クイズ',
  polling: '実態調査',
  opinion: '多数派/少数派',
};

interface PresetPreviewDrawerProps {
  preset: Game | null;
  onClose: () => void;
}

export default function PresetPreviewDrawer({ preset, onClose }: PresetPreviewDrawerProps) {
  const t = useTranslations('presets');
  const isOpen = preset !== null;

  // Escape キーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ドロワーが開いているときはbodyスクロールをロック
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/70 transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ドロワー */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={preset?.title ?? 'プレビュー'}
        className={[
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-[var(--kg-ink)] border-l border-[rgba(var(--kg-paper-rgb),.12)]',
          'w-full sm:w-[420px]',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {preset && (
          <>
            {/* ヘッダー */}
            <div className="flex-shrink-0 border-b border-[rgba(var(--kg-paper-rgb),.12)] px-5 py-4">
              <p className="kg-h text-[1.05rem] leading-tight">
                {preset.title}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[0.7rem] text-[var(--kg-mist)]" style={{ letterSpacing: '0.04em' }}>
                <span className="text-[var(--kg-gold)]">{MODE_LABEL[preset.mode] ?? preset.mode}</span>
                <span aria-hidden>·</span>
                <span>{t('previewQuestionCount', { count: preset.questions.length })}</span>
              </p>
            </div>

            {/* 問題リスト */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {preset.questions.map((q, i) => (
                <div
                  key={`${q.id ?? i}`}
                  className="kg-card p-4"
                >
                  <p className="kg-h mb-3 text-[0.9rem] leading-snug">
                    Q{i + 1}. {q.text}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {q.options.map((opt, j) => (
                      <li
                        key={`${i}-${j}`}
                        className="border border-[rgba(var(--kg-paper-rgb),.12)] bg-[var(--kg-ink)] px-3 py-2 text-[0.74rem] text-[var(--kg-paper-dim)]"
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* フッター */}
            <div className="flex-shrink-0 border-t border-[rgba(var(--kg-paper-rgb),.12)] px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] w-full border border-[rgba(var(--kg-paper-rgb),.16)] text-[0.86rem] text-[var(--kg-paper)]/85 transition-colors duration-300 hover:border-[rgba(var(--kg-paper-rgb),.4)] touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
              >
                {t('previewClose')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
