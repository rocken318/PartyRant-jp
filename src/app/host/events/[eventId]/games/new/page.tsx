'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestionEditor } from '@/components/QuestionEditor';
import type { FormValues } from '@/components/QuestionEditor';

const questionSchema = z.object({
  text: z.string().min(1, 'Required').max(200),
  imageUrl: z.string().optional(),
  // players/casts は開始時に名前へ自動置換されるため、値の入力は任意。
  options: z.array(z.object({ value: z.string().max(200) })).min(2).max(4),
  correctIndex: z.number().optional(),
  timeLimitSec: z.number().min(10).max(60),
  answerTarget: z.enum(['fixed', 'players', 'casts']).optional(),
}).superRefine((q, ctx) => {
  // fixed（未指定含む）のときのみ全 option に値が必要。
  if ((q.answerTarget ?? 'fixed') === 'fixed') {
    q.options.forEach((o, i) => {
      if (!o.value || o.value.trim() === '') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required', path: ['options', i, 'value'] });
      }
    });
  }
});

const schema = z.object({
  mode: z.enum(['trivia', 'polling', 'opinion']),
  loseRule: z.enum(['minority', 'majority']).optional(),
  gameMode: z.enum(['live', 'self_paced']),
  title: z.string().min(1, 'Required').max(80),
  questions: z.array(questionSchema).min(1).max(10),
});

type LocalFormValues = z.infer<typeof schema>;

const defaultQuestion = (): FormValues['questions'][number] => ({
  text: '',
  imageUrl: undefined,
  options: [{ value: '' }, { value: '' }],
  correctIndex: undefined,
  timeLimitSec: 20,
  answerTarget: 'fixed',
});

export default function NewGamePage() {
  const t = useTranslations('newGame');
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<LocalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'trivia', loseRule: 'minority', gameMode: 'live', title: '', questions: [defaultQuestion()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const mode = watch('mode');
  const gameMode = watch('gameMode');

  const onSubmit = async (data: LocalFormValues) => {
    const body = {
      eventId,
      mode: data.mode,
      loseRule: data.loseRule,
      gameMode: data.gameMode,
      title: data.title,
      questions: data.questions.map((q, i) => ({
        order: i, text: q.text, imageUrl: q.imageUrl,
        options: q.options.map(o => o.value),
        correctIndex: q.correctIndex,
        timeLimitSec: q.timeLimitSec,
        answerTarget: q.answerTarget,
      })),
    };

    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert(t('failedToCreate')); return; }
    const game = await res.json() as { id: string };
    router.push(`/host/events/${eventId}/games/${game.id}`);
  };

  return (
    <main className="flex flex-col min-h-screen bg-white">
      <div className="bg-pr-pink px-4 py-4 flex items-center gap-4 rounded-b-[20px]">
        <Link href={`/host/events/${eventId}`}
          className="text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full border-[2px] border-white/30 hover:border-white transition-colors touch-manipulation">
          ←
        </Link>
        <span className="text-white text-3xl tracking-wide" style={{ fontFamily: 'var(--font-bebas)' }}>{t('title')}</span>
      </div>

      <div className="max-w-[720px] w-full mx-auto px-4 py-8 flex flex-col gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>

          {/* Game type */}
          <div className="flex flex-col gap-3">
            <Label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('gameTypeSectionLabel')}</Label>
            <Controller control={control} name="mode" render={({ field }) => (
              <div className="grid grid-cols-3 gap-3">
                {(['trivia', 'polling', 'opinion'] as const).map(m => (
                  <button key={m} type="button" onClick={() => field.onChange(m)}
                    className={['flex flex-col items-center gap-2 p-4 rounded-[8px] border-[3px] border-pr-dark transition-[box-shadow,transform] duration-75 touch-manipulation min-h-[96px]',
                      field.value === m ? 'bg-pr-pink text-white shadow-[0_2px_8px_rgba(0,0,0,.3)] translate-x-[2px] translate-y-[2px]' : 'bg-white text-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)]'].join(' ')}>
                    <span className="text-2xl">{m === 'trivia' ? '🧠' : m === 'polling' ? '📊' : '⚔️'}</span>
                    <span className="font-bold text-xs text-center" style={{ fontFamily: 'var(--font-dm)' }}>
                      {m === 'trivia' ? t('triviaLabel') : m === 'polling' ? t('pollingLabel') : t('opinionLabel')}
                    </span>
                    <span className="text-xs text-center opacity-70">
                      {m === 'trivia' ? t('triviaDescription') : m === 'polling' ? t('pollingDescription') : t('opinionDescription')}
                    </span>
                  </button>
                ))}
              </div>
            )} />
          </div>

          {/* Lose rule (opinion only) */}
          {mode === 'opinion' && (
            <div className="flex flex-col gap-3">
              <Label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('loseRuleSectionLabel')}</Label>
              <Controller control={control} name="loseRule" render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(['minority', 'majority'] as const).map(r => (
                    <button key={r} type="button" onClick={() => field.onChange(r)}
                      className={['flex flex-col items-center gap-2 p-5 rounded-[8px] border-[3px] border-pr-dark transition-[box-shadow,transform] duration-75 touch-manipulation min-h-[96px]',
                        field.value === r ? 'bg-pr-dark text-white shadow-[0_2px_8px_rgba(0,0,0,.3)] translate-x-[2px] translate-y-[2px]' : 'bg-white text-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)]'].join(' ')}>
                      <span className="text-2xl">{r === 'minority' ? '🦄' : '🐑'}</span>
                      <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-dm)' }}>
                        {r === 'minority' ? t('loseRuleMinority') : t('loseRuleMajority')}
                      </span>
                      <span className="text-xs text-center opacity-70">
                        {r === 'minority' ? t('loseRuleMinorityDesc') : t('loseRuleMajorityDesc')}
                      </span>
                    </button>
                  ))}
                </div>
              )} />
            </div>
          )}

          {/* Play mode */}
          <div className="flex flex-col gap-3">
            <Label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('playModeSectionLabel')}</Label>
            <Controller control={control} name="gameMode" render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {(['live', 'self_paced'] as const).map(m => (
                  <button key={m} type="button" onClick={() => field.onChange(m)}
                    className={['flex flex-col items-center gap-2 p-5 rounded-[8px] border-[3px] border-pr-dark transition-[box-shadow,transform] duration-75 touch-manipulation min-h-[96px]',
                      field.value === m ? 'bg-pr-dark text-white shadow-[0_2px_8px_rgba(0,0,0,.3)] translate-x-[2px] translate-y-[2px]' : 'bg-white text-pr-dark shadow-[0_4px_16px_rgba(0,0,0,.4)]'].join(' ')}>
                    <span className="text-2xl">{m === 'live' ? '🎙️' : '🎯'}</span>
                    <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-dm)' }}>{m === 'live' ? t('liveLabel') : t('selfPacedLabel')}</span>
                    <span className="text-xs text-center opacity-70">{m === 'live' ? t('liveDescription') : t('selfPacedDescription')}</span>
                  </button>
                ))}
              </div>
            )} />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('gameTitleLabel')}</Label>
            <Input id="title" {...register('title')} placeholder={t('gameTitlePlaceholder')}
              className="text-base h-12 border-[3px] border-pr-dark shadow-[0_4px_12px_rgba(0,0,0,.35)] rounded-[6px]" maxLength={80} />
            {errors.title && <p className="text-sm text-red-500 font-bold">{errors.title.message}</p>}
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-4">
            <Label className="font-bold uppercase tracking-widest text-xs text-gray-500">{t('questionsLabel')}</Label>
            {fields.map((field, i) => (
              <QuestionEditor key={field.id} index={i} mode={mode} control={control as never}
                register={register as never} remove={() => remove(i)} watch={watch as never} setValue={setValue as never} />
            ))}
            {fields.length < 10 && (
              <button type="button" onClick={() => append(defaultQuestion())}
                className="h-12 w-full font-bold text-pr-dark border-[3px] border-dashed border-pr-dark rounded-[6px] hover:bg-gray-50 touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)' }}>
                {t('addQuestion')}
              </button>
            )}
          </div>

          {gameMode === 'self_paced' && (
            <p className="text-sm text-gray-400 font-bold text-center -mt-4">
              {t('selfPacedNote')}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[0_10px_40px_rgba(0,0,0,.5)] active:shadow-[0_1px_4px_rgba(0,0,0,.3)] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 disabled:opacity-50 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}>
            {isSubmitting ? t('submitting') : t('publish')}
          </button>
        </form>
      </div>
    </main>
  );
}
