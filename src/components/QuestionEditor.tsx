'use client';

import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';
import type { Control, UseFormRegister, UseFormWatch, UseFormSetValue, ControllerRenderProps } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ImageUploader } from '@/components/ImageUploader';
import type { GameMode, AnswerTarget } from '@/types/domain';

export interface QuestionFormValues {
  text: string;
  imageUrl?: string;
  options: { value: string }[];
  correctIndex?: number;
  timeLimitSec: number;
  answerTarget?: AnswerTarget;
}

export interface FormValues {
  mode: GameMode;
  title: string;
  questions: QuestionFormValues[];
}

interface QuestionEditorProps {
  index: number;
  mode: GameMode;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  remove: () => void;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

const OPTION_COLORS = ['teal', 'coral', 'amber', 'purple'] as const;
// 墨基調：選択肢バッジは金のヘアライン枠で統一（原色を排し上品に）
const OPTION_LABEL_COLORS: Record<string, string> = {
  teal: 'border-[#b8935a]/55 text-[#b8935a]',
  coral: 'border-[#b8935a]/55 text-[#b8935a]',
  amber: 'border-[#b8935a]/55 text-[#b8935a]',
  purple: 'border-[#b8935a]/55 text-[#b8935a]',
};

export function QuestionEditor({
  index,
  mode,
  control,
  register,
  remove,
  watch,
  setValue,
}: QuestionEditorProps) {
  const { fields, append, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  });

  const timeLimitSec = watch(`questions.${index}.timeLimitSec`);
  const correctIndex = watch(`questions.${index}.correctIndex`);
  const answerTarget: AnswerTarget = watch(`questions.${index}.answerTarget`) ?? 'fixed';
  const isFixed = answerTarget === 'fixed';
  // fixed かつ trivia のときのみ正解指定を表示。players/casts は開始時に名前へ自動置換。
  const showCorrectPicker = mode === 'trivia' && isFixed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question {index + 1}</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={remove}
            aria-label="Remove question"
            className="text-muted-foreground hover:text-destructive"
          >
            ✕
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Question text */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`q-${index}-text`}>Question text</Label>
          <Textarea
            id={`q-${index}-text`}
            {...register(`questions.${index}.text`)}
            placeholder="Type your question here..."
            className="text-base min-h-[80px]"
          />
        </div>

        {/* Image */}
        <div className="flex flex-col gap-2">
          <Label>Image (optional)</Label>
          <Controller
            control={control}
            name={`questions.${index}.imageUrl`}
            render={({ field }: { field: ControllerRenderProps<FormValues, `questions.${number}.imageUrl`> }) => (
              <ImageUploader
                value={field.value}
                onChange={(url) => field.onChange(url)}
              />
            )}
          />
        </div>

        {/* Answer target (選択対象の種別) */}
        <div className="flex flex-col gap-2">
          <Label>選択肢の種別</Label>
          <Controller
            control={control}
            name={`questions.${index}.answerTarget`}
            render={({ field }: { field: ControllerRenderProps<FormValues, `questions.${number}.answerTarget`> }) => (
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'fixed', label: '固定内容' },
                  { value: 'players', label: '参加者' },
                  { value: 'casts', label: 'キャスト' },
                ] as const).map((opt) => {
                  const selected = (field.value ?? 'fixed') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`min-h-[44px] border text-sm transition-colors duration-300 touch-manipulation ${
                        selected ? 'bg-[#cf3a2e] border-[#cf3a2e] text-[#ece7df]' : 'bg-[#111114] border-[rgba(236,231,223,.14)] text-[#ece7df]/80 hover:border-[rgba(236,231,223,.4)]'
                      }`}
                      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {!isFixed && (
            <p className="text-xs text-muted-foreground">
              開始時に選択肢は{answerTarget === 'players' ? '参加者名' : 'キャスト名'}へ自動置換されます（この設問は採点されません）。
            </p>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          <Label>Answer options</Label>
          {fields.map((field: { id: string }, optIdx: number) => {
            const colorKey = OPTION_COLORS[optIdx % OPTION_COLORS.length];
            const isCorrect = showCorrectPicker && correctIndex === optIdx;
            return (
              <div key={field.id} className={`flex items-center gap-2 ${!isFixed ? 'opacity-50' : ''}`}>
                {showCorrectPicker ? (
                  <button
                    type="button"
                    onClick={() => setValue(`questions.${index}.correctIndex`, optIdx)}
                    aria-label={`Set option ${optIdx + 1} as correct`}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border font-medium text-sm transition-colors duration-300 touch-manipulation flex items-center justify-center ${
                      isCorrect
                        ? 'bg-[#cf3a2e] border-[#cf3a2e] text-[#ece7df]'
                        : `${OPTION_LABEL_COLORS[colorKey]} bg-transparent`
                    }`}
                    style={{ fontFamily: 'var(--font-bebas)' }}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </button>
                ) : (
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full border font-medium text-sm flex items-center justify-center ${OPTION_LABEL_COLORS[colorKey]}`}
                    style={{ fontFamily: 'var(--font-bebas)' }}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                )}
                <Input
                  {...register(`questions.${index}.options.${optIdx}.value`)}
                  placeholder={
                    isFixed
                      ? `Option ${String.fromCharCode(65 + optIdx)}`
                      : answerTarget === 'players'
                      ? '開始時に参加者名へ置換'
                      : '開始時にキャスト名へ置換'
                  }
                  disabled={!isFixed}
                  className="flex-1 text-base h-12"
                />
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(optIdx)}
                    aria-label={`Remove option ${optIdx + 1}`}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </Button>
                )}
              </div>
            );
          })}
          {fields.length < 4 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: '' })}
              className="self-start h-10 touch-manipulation"
            >
              + Add option
            </Button>
          )}
        </div>

        {/* Time limit */}
        <div className="flex flex-col gap-2">
          <Label>
            Time limit: <span className="font-bold">{timeLimitSec}s</span>
          </Label>
          <Controller
            control={control}
            name={`questions.${index}.timeLimitSec`}
            render={({ field }: { field: ControllerRenderProps<FormValues, `questions.${number}.timeLimitSec`> }) => (
              <Slider
                min={10}
                max={60}
                step={5}
                value={[field.value]}
                onValueChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
              />
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10s</span>
            <span>60s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
