'use client';

import { useTranslations } from 'next-intl';
import type { Game } from '@/types/domain';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const TYPE_LABEL: Record<string, string> = {
  trivia:  '🧠 クイズ',
  polling: '📊 実態調査',
  opinion: '⚔️ 多数派/少数派',
};

interface Props {
  preset: Game | null;
  onClose: () => void;
}

export default function PresetPreviewDrawer({ preset, onClose }: Props) {
  const t = useTranslations('presets');

  return (
    <Sheet open={preset !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0 overflow-hidden">
        {preset && (
          <>
            <SheetHeader className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <SheetTitle className="text-left text-base font-bold text-pr-dark leading-tight">
                {preset.title}
              </SheetTitle>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                <span>{TYPE_LABEL[preset.mode] ?? preset.mode}</span>
                <span>·</span>
                <span>{t('previewQuestionCount', { count: preset.questions.length })}</span>
              </p>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {preset.questions.map((q, i) => (
                <div
                  key={q.id}
                  className="bg-gray-50 rounded-[8px] border border-gray-200 p-4"
                >
                  <p className="text-sm font-bold text-pr-dark mb-3">
                    Q{i + 1}. {q.text}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {q.options.map((opt, j) => (
                      <li
                        key={j}
                        className="text-xs text-gray-600 bg-white border border-gray-200 rounded-[6px] px-3 py-2"
                      >
                        {opt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-[6px] border-[2px] border-pr-dark text-pr-dark font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                {t('previewClose')}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
