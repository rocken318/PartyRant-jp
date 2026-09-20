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
    <main className="kg-page kg-grain">
      <div aria-hidden className="kg-glow" />

      <div className="relative z-[2] mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-6 pb-12">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 pt-8">
          <Link href={`/host/events/${eventId}`}
            aria-label="←"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(236,231,223,.16)] text-[#ece7df]/80 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)] touch-manipulation">
            <span aria-hidden className="text-lg">←</span>
          </Link>
          <div className="min-w-0">
            <span className="kg-eyebrow">New Game</span>
            <p className="kg-h mt-1 text-[1.4rem] leading-tight">{t('title')}</p>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10 flex flex-col gap-8" noValidate>

          {/* Game type */}
          <div className="flex flex-col gap-3">
            <Label className="kg-label">{t('gameTypeSectionLabel')}</Label>
            <Controller control={control} name="mode" render={({ field }) => (
              <div className="grid grid-cols-3 gap-3">
                {(['trivia', 'polling', 'opinion'] as const).map(m => {
                  const active = field.value === m;
                  return (
                    <button key={m} type="button" onClick={() => field.onChange(m)}
                      className={['flex min-h-[96px] flex-col items-center justify-center gap-2 border p-4 text-center transition-colors duration-300 touch-manipulation',
                        active ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)] hover:border-[rgba(236,231,223,.4)]'].join(' ')}>
                      <span className="text-[0.9rem]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}>
                        {m === 'trivia' ? t('triviaLabel') : m === 'polling' ? t('pollingLabel') : t('opinionLabel')}
                      </span>
                      <span className={`text-[0.66rem] leading-snug ${active ? 'text-[#ece7df]/80' : 'text-[#7d7871]'}`}>
                        {m === 'trivia' ? t('triviaDescription') : m === 'polling' ? t('pollingDescription') : t('opinionDescription')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )} />
          </div>

          {/* Lose rule (opinion only) */}
          {mode === 'opinion' && (
            <div className="flex flex-col gap-3">
              <Label className="kg-label">{t('loseRuleSectionLabel')}</Label>
              <Controller control={control} name="loseRule" render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(['minority', 'majority'] as const).map(r => {
                    const active = field.value === r;
                    return (
                      <button key={r} type="button" onClick={() => field.onChange(r)}
                        className={['flex min-h-[96px] flex-col items-center justify-center gap-2 border p-5 text-center transition-colors duration-300 touch-manipulation',
                          active ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)] hover:border-[rgba(236,231,223,.4)]'].join(' ')}>
                        <span className="text-[0.92rem]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}>
                          {r === 'minority' ? t('loseRuleMinority') : t('loseRuleMajority')}
                        </span>
                        <span className={`text-[0.66rem] leading-snug ${active ? 'text-[#ece7df]/80' : 'text-[#7d7871]'}`}>
                          {r === 'minority' ? t('loseRuleMinorityDesc') : t('loseRuleMajorityDesc')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )} />
            </div>
          )}

          {/* Play mode */}
          <div className="flex flex-col gap-3">
            <Label className="kg-label">{t('playModeSectionLabel')}</Label>
            <Controller control={control} name="gameMode" render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {(['live', 'self_paced'] as const).map(m => {
                  const active = field.value === m;
                  return (
                    <button key={m} type="button" onClick={() => field.onChange(m)}
                      className={['flex min-h-[96px] flex-col items-center justify-center gap-2 border p-5 text-center transition-colors duration-300 touch-manipulation',
                        active ? 'bg-[#cf3a2e] text-[#ece7df] border-[#cf3a2e]' : 'bg-[#111114] text-[#ece7df]/85 border-[rgba(236,231,223,.14)] hover:border-[rgba(236,231,223,.4)]'].join(' ')}>
                      <span className="text-[0.92rem]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}>{m === 'live' ? t('liveLabel') : t('selfPacedLabel')}</span>
                      <span className={`text-[0.66rem] leading-snug ${active ? 'text-[#ece7df]/80' : 'text-[#7d7871]'}`}>{m === 'live' ? t('liveDescription') : t('selfPacedDescription')}</span>
                    </button>
                  );
                })}
              </div>
            )} />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className="kg-label">{t('gameTitleLabel')}</Label>
            <Input id="title" {...register('title')} placeholder={t('gameTitlePlaceholder')}
              className="kg-input" maxLength={80} />
            {errors.title && <p className="text-[0.8rem] text-[#cf3a2e]">{errors.title.message}</p>}
          </div>

          {/* Questions */}
          <div className="flex flex-col gap-4">
            <Label className="kg-label">{t('questionsLabel')}</Label>
            {fields.map((field, i) => (
              <QuestionEditor key={field.id} index={i} mode={mode} control={control as never}
                register={register as never} remove={() => remove(i)} watch={watch as never} setValue={setValue as never} />
            ))}
            {fields.length < 10 && (
              <button type="button" onClick={() => append(defaultQuestion())}
                className="min-h-[48px] w-full border border-dashed border-[rgba(184,147,90,.5)] text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5 touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}>
                {t('addQuestion')}
              </button>
            )}
          </div>

          {gameMode === 'self_paced' && (
            <p className="-mt-4 text-center text-[0.78rem] text-[#7d7871]">
              {t('selfPacedNote')}
            </p>
          )}

          <button type="submit" disabled={isSubmitting}
            className="kg-btn kg-btn--primary">
            <span>{isSubmitting ? t('submitting') : t('publish')}</span>
            {!isSubmitting && <span aria-hidden>→</span>}
          </button>
        </form>
      </div>
    </main>
  );
}
