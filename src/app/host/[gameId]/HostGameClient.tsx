'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { JoinCodeDisplay } from '@/components/JoinCodeDisplay';
import { GameQRCode } from '@/components/GameQRCode';
import { PlayerList } from '@/components/PlayerList';
import { CountdownTimer } from '@/components/CountdownTimer';
import { VoteBar } from '@/components/VoteBar';
import { Leaderboard } from '@/components/Leaderboard';
import { GameStatusBadge } from '@/components/GameStatusBadge';
import { useGameStream } from '@/lib/hooks/useGameStream';
import type { Game, Player, Answer, Score, Question } from '@/types/domain';
import type { GameEvent } from '@/lib/events/types';

interface State {
  game: Game | null;
  players: Player[];
  answers: Answer[];
  scores: Score[];
  opinionResults: OpinionResult[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'LOADED'; game: Game; players: Player[]; answers: Answer[] }
  | { type: 'SYNCED'; game: Game; players: Player[]; answers: Answer[] }
  | { type: 'ERROR'; message: string }
  | { type: 'GAME_UPDATED'; game: Game }
  | { type: 'PLAYER_JOINED'; player: Player }
  | { type: 'ANSWER_SUBMITTED'; answer: Answer }
  | { type: 'SCORES_LOADED'; scores: Score[] }
  | { type: 'OPINION_RESULTS_LOADED'; opinionResults: OpinionResult[] }
  | { type: 'QUESTION_STARTED'; questionIndex: number; startedAt: number }
  | { type: 'QUESTION_ENDED' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { ...state, loading: false, game: action.game, players: action.players, answers: action.answers };
    case 'SYNCED':
      return { ...state, game: action.game, players: action.players, answers: action.answers };
    case 'ERROR':
      return { ...state, loading: false, error: action.message };
    case 'GAME_UPDATED':
      return { ...state, game: action.game };
    case 'PLAYER_JOINED':
      if (state.players.some((p) => p.id === action.player.id)) return state;
      return { ...state, players: [...state.players, action.player] };
    case 'ANSWER_SUBMITTED':
      if (state.answers.some((a) => a.id === action.answer.id)) return state;
      return { ...state, answers: [...state.answers, action.answer] };
    case 'SCORES_LOADED':
      return { ...state, scores: action.scores };
    case 'OPINION_RESULTS_LOADED':
      return { ...state, opinionResults: action.opinionResults };
    case 'QUESTION_STARTED':
      if (!state.game) return state;
      return {
        ...state,
        game: {
          ...state.game,
          status: 'question',
          currentQuestionIndex: action.questionIndex,
          currentQuestionStartedAt: action.startedAt,
        },
      };
    case 'QUESTION_ENDED':
      if (!state.game) return state;
      return { ...state, game: { ...state.game, status: 'reveal' } };
    default:
      return state;
  }
}

const initialState: State = {
  game: null, players: [], answers: [], scores: [], opinionResults: [], loading: true, error: null,
};

function computeScores(game: Game, players: Player[], answers: Answer[]): Score[] {
  const scoreMap = new Map<string, Score>();
  for (const player of players) {
    scoreMap.set(player.id, { playerId: player.id, displayName: player.displayName, totalPoints: 0, correctCount: 0 });
  }
  for (const question of game.questions) {
    if (question.correctIndex === undefined) continue;
    const qAnswers = answers.filter((a) => a.questionId === question.id);
    const correct = qAnswers.filter((a) => a.choiceIndex === question.correctIndex);
    for (const ans of correct) {
      const existing = scoreMap.get(ans.playerId);
      if (!existing) continue;
      scoreMap.set(ans.playerId, { ...existing, totalPoints: existing.totalPoints + 1, correctCount: existing.correctCount + 1 });
    }
  }
  return Array.from(scoreMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}

interface OpinionResult {
  playerId: string;
  displayName: string;
  lossCount: number;
}

function computeOpinionResults(game: Game, players: Player[], answers: Answer[]): OpinionResult[] {
  const resultMap = new Map<string, OpinionResult>();
  for (const player of players) {
    resultMap.set(player.id, { playerId: player.id, displayName: player.displayName, lossCount: 0 });
  }

  const loseRule = game.loseRule ?? 'minority';

  for (const question of game.questions) {
    const qAnswers = answers.filter((a) => a.questionId === question.id);
    if (qAnswers.length === 0) continue;
    const voteCounts = question.options.map((_, i) => qAnswers.filter((a) => a.choiceIndex === i).length);
    const nonZero = voteCounts.filter(v => v > 0);
    if (nonZero.length <= 1) continue; // everyone picked same option, no loser

    const threshold = loseRule === 'minority' ? Math.min(...nonZero) : Math.max(...nonZero);
    // find ALL option indices that match threshold (handle ties)
    const losingIndices = new Set(voteCounts.map((v, i) => v === threshold ? i : -1).filter(i => i >= 0));

    for (const ans of qAnswers) {
      if (losingIndices.has(ans.choiceIndex)) {
        const existing = resultMap.get(ans.playerId);
        if (existing) resultMap.set(ans.playerId, { ...existing, lossCount: existing.lossCount + 1 });
      }
    }
  }

  return Array.from(resultMap.values()).sort((a, b) => b.lossCount - a.lossCount);
}

function computePollingResults(
  questions: import('@/types/domain').Question[],
  answers: import('@/types/domain').Answer[],
  players: import('@/types/domain').Player[]
): { playerId: string; displayName: string; majorityCount: number; minorityCount: number }[] {
  const map = new Map<string, { playerId: string; displayName: string; majorityCount: number; minorityCount: number }>();
  for (const p of players) {
    map.set(p.id, { playerId: p.id, displayName: p.displayName, majorityCount: 0, minorityCount: 0 });
  }
  for (const q of questions) {
    const qAnswers = answers.filter(a => a.questionId === q.id);
    if (qAnswers.length < 2) continue;
    const voteCounts = q.options.map((_, i) => qAnswers.filter(a => a.choiceIndex === i).length);
    const maxVotes = Math.max(...voteCounts);
    for (const ans of qAnswers) {
      const entry = map.get(ans.playerId);
      if (!entry) continue;
      if (voteCounts[ans.choiceIndex] === maxVotes) {
        entry.majorityCount++;
      } else {
        entry.minorityCount++;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.majorityCount - a.majorityCount);
}

function computePersonVoteResults(
  questions: import('@/types/domain').Question[],
  answers: import('@/types/domain').Answer[],
  players: import('@/types/domain').Player[]
): { displayName: string; voteCount: number }[] | null {
  const playerNames = new Set(players.map(p => p.displayName));
  const personQuestions = questions.filter(q => isPersonVoteQuestion(q.options, playerNames));
  if (personQuestions.length === 0) return null;

  const voteMap = new Map<string, number>();
  for (const p of players) voteMap.set(p.displayName, 0);

  for (const q of personQuestions) {
    for (const ans of answers.filter(a => a.questionId === q.id)) {
      const chosen = q.options[ans.choiceIndex];
      if (chosen !== undefined && voteMap.has(chosen)) {
        voteMap.set(chosen, (voteMap.get(chosen) ?? 0) + 1);
      }
    }
  }

  return Array.from(voteMap.entries())
    .map(([displayName, voteCount]) => ({ displayName, voteCount }))
    .sort((a, b) => b.voteCount - a.voteCount);
}

function isPersonVoteQuestion(options: string[], playerNames: Set<string>): boolean {
  return options.length > 0 && options.every(opt => playerNames.has(opt));
}

async function advanceGame(gameId: string): Promise<Game | null> {
  const res = await fetch(`/api/games/${gameId}/advance`, { method: 'POST' });
  if (!res.ok) return null;
  return res.json() as Promise<Game>;
}

function PinkBtn({
  onClick,
  children,
  disabled = false,
  outline = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  outline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex w-full min-h-[56px] items-center justify-center gap-2 touch-manipulation transition-colors duration-300',
        outline
          ? 'border border-[rgba(var(--kg-paper-rgb),.16)] text-[var(--kg-paper)]/85 hover:border-[rgba(var(--kg-paper-rgb),.4)]'
          : 'bg-[var(--kg-accent)] text-[var(--kg-paper)] hover:bg-[var(--kg-accent-hover)] active:bg-[var(--kg-accent-deep)]',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].filter(Boolean).join(' ')}
      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', ...(outline ? {} : { boxShadow: '0 14px 40px rgba(var(--kg-accent-rgb),.24)' }) }}
    >
      {children}
    </button>
  );
}

export function HostGameClient({ gameId }: { gameId: string }) {
  const t = useTranslations('hostGame');
  const [state, dispatch] = useReducer(reducer, initialState);
  const { game, players, answers, scores, opinionResults, loading, error } = state;

  // Host participation mode
  const [hostParticipating, setHostParticipating] = useState(false);
  const [hostNameInput, setHostNameInput] = useState('');
  const [hostShowInput, setHostShowInput] = useState(false);
  const [hostJoining, setHostJoining] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);
  const [hostAnsweredIds, setHostAnsweredIds] = useState<Set<string>>(new Set());
  const [hostSelectedChoice, setHostSelectedChoice] = useState<{ questionId: string; choiceIndex: number } | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [gameRes, playersRes, answersRes] = await Promise.all([
          fetch(`/api/games/${gameId}`),
          fetch(`/api/games/${gameId}/players`),
          fetch(`/api/games/${gameId}/answers`),
        ]);
        if (!gameRes.ok) throw new Error(t('notFound'));
        const gameData = await gameRes.json() as Game;
        const playersData = playersRes.ok ? await playersRes.json() as Player[] : [];
        const answersData = answersRes.ok ? await answersRes.json() as Answer[] : [];
        dispatch({ type: 'LOADED', game: gameData, players: playersData, answers: answersData });
      } catch (e) {
        dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : t('notFound') });
      }
    };
    load();
  }, [gameId]);

  // Poll players while in the lobby as a fallback for local networks where
  // Supabase Realtime broadcasts are delayed or blocked.
  useEffect(() => {
    if (!game || game.status !== 'lobby') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/players`);
        if (!res.ok) return;
        const latest = await res.json() as Player[];
        latest.forEach((player) => dispatch({ type: 'PLAYER_JOINED', player }));
      } catch {
        // Keep the lobby usable if a single poll fails.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameId, game?.status]);

  useEffect(() => {
    if (!game) return;
    if ((game.status === 'reveal' || game.status === 'ended') && game.mode === 'trivia') {
      dispatch({ type: 'SCORES_LOADED', scores: computeScores(game, players, answers) });
    }
    if (game.status === 'ended' && game.mode === 'opinion') {
      dispatch({ type: 'OPINION_RESULTS_LOADED', opinionResults: computeOpinionResults(game, players, answers) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, answers.length, players.length]);

  const handleEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case 'connected': {
        Promise.all([
          fetch(`/api/games/${gameId}`).then(r => r.ok ? r.json() as Promise<Game> : Promise.reject()),
          fetch(`/api/games/${gameId}/players`).then(r => r.ok ? r.json() as Promise<Player[]> : Promise.resolve([])),
          fetch(`/api/games/${gameId}/answers`).then(r => r.ok ? r.json() as Promise<Answer[]> : Promise.resolve([])),
        ]).then(([game, players, answers]) => {
          dispatch({ type: 'SYNCED', game, players, answers });
        }).catch(() => {});
        break;
      }
      case 'player_joined': dispatch({ type: 'PLAYER_JOINED', player: event.player }); break;
      case 'game_started':
      case 'game_ended': dispatch({ type: 'GAME_UPDATED', game: event.game }); break;
      case 'question_started': dispatch({ type: 'QUESTION_STARTED', questionIndex: event.questionIndex, startedAt: event.startedAt }); break;
      case 'question_ended': dispatch({ type: 'QUESTION_ENDED' }); break;
      case 'answer_submitted': dispatch({ type: 'ANSWER_SUBMITTED', answer: event.answer }); break;
    }
  }, [gameId]);

  useGameStream(gameId, handleEvent);

  const handleAdvance = async () => {
    const updated = await advanceGame(gameId);
    if (updated) dispatch({ type: 'GAME_UPDATED', game: updated });
  };

  async function handleHostJoin() {
    const name = hostNameInput.trim();
    if (!name) return;
    setHostJoining(true);
    try {
      const res = await fetch(`/api/games/${gameId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      if (res.ok) {
        const player = await res.json() as import('@/types/domain').Player;
        setHostPlayerId(player.id);
        setHostParticipating(true);
        setHostShowInput(false);
        dispatch({ type: 'PLAYER_JOINED', player });
      }
    } finally {
      setHostJoining(false);
    }
  }

  async function handleHostAnswer(choiceIndex: number) {
    if (!hostPlayerId || !currentQuestion || hostAnswered || hostSubmitting) return;
    setHostSelectedChoice({ questionId: currentQuestion.id, choiceIndex });
    setHostSubmitting(true);
    try {
      const res = await fetch(`/api/games/${gameId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: hostPlayerId, questionId: currentQuestion.id, choiceIndex }),
      });
      if (res.ok) {
        const answer = await res.json() as import('@/types/domain').Answer;
        dispatch({ type: 'ANSWER_SUBMITTED', answer });
        setHostAnsweredIds(prev => new Set([...prev, currentQuestion.id]));
      }
    } finally {
      setHostSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="kg-page kg-grain flex flex-1 items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--kg-accent)] border-t-transparent" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="kg-page kg-grain flex flex-1 flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-[0.9rem] text-[var(--kg-accent)]">{error ?? t('notFound')}</p>
        <Link href="/host/new" className={buttonVariants({ variant: 'outline' })}>
          {t('createNew')}
        </Link>
      </div>
    );
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const currentVotes = (() => {
    if (!currentQuestion) return [];
    const qAnswers = answers.filter((a: Answer) => a.questionId === currentQuestion.id);
    return currentQuestion.options.map((_: string, i: number) =>
      qAnswers.filter((a: Answer) => a.choiceIndex === i).length
    );
  })();

  const hostAnswered = hostParticipating && !!hostPlayerId && !!currentQuestion
    ? hostAnsweredIds.has(currentQuestion.id)
    : false;

  // Show VoteBar when: not participating, OR not in question state, OR host already answered
  const showVoteBar = !hostParticipating || game.status !== 'question' || hostAnswered;

  return (
    <main className="kg-page kg-grain flex flex-col min-h-screen">
      {/* Sticky ink header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[rgba(var(--kg-paper-rgb),.12)] bg-[var(--kg-ink)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/presets"
            aria-label="←"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-[var(--kg-paper)]/70 transition-colors hover:text-[var(--kg-paper)] touch-manipulation"
          >
            <span aria-hidden className="text-lg">←</span>
          </Link>
          <div className="flex flex-col min-w-0">
            <h1
              className="kg-h max-w-[160px] truncate text-[1.15rem] leading-tight sm:max-w-none"
            >
              {game.title}
            </h1>
            <p className="text-[0.62rem] uppercase capitalize text-[var(--kg-mist)]" style={{ letterSpacing: '0.16em' }}>{game.mode}</p>
          </div>
        </div>
        <GameStatusBadge status={game.status} />
      </header>

      <div className="relative z-[2] flex-1 max-w-[720px] w-full mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Phase A: Lobby */}
        {game.status === 'lobby' && (
          <>
            <div className="flex flex-col items-center gap-6 py-4">
              <JoinCodeDisplay code={game.joinCode} />
              <GameQRCode joinCode={game.joinCode} />
            </div>
            <PlayerList players={players} />
            {/* Host participation opt-in */}
            {!hostParticipating ? (
              <div className="flex flex-col gap-2">
                {!hostShowInput ? (
                  <button
                    type="button"
                    onClick={() => setHostShowInput(true)}
                    className="min-h-[48px] w-full border border-[rgba(var(--kg-gold-rgb),.45)] text-[0.86rem] text-[var(--kg-gold)] transition-colors duration-300 hover:border-[var(--kg-gold)] hover:bg-[var(--kg-gold)]/5 touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
                  >
                    ＋ ホストも参加する
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={hostNameInput}
                      onChange={e => setHostNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleHostJoin(); }}
                      placeholder="あなたの名前"
                      maxLength={20}
                      autoFocus
                      className="kg-input flex-1"
                      style={{ fontFamily: 'var(--font-dm)' }}
                    />
                    <button
                      type="button"
                      onClick={handleHostJoin}
                      disabled={!hostNameInput.trim() || hostJoining}
                      className="shrink-0 min-h-[48px] px-5 bg-[var(--kg-accent)] text-[var(--kg-paper)] text-[0.86rem] transition-colors duration-300 hover:bg-[var(--kg-accent-hover)] active:bg-[var(--kg-accent-deep)] disabled:opacity-50 touch-manipulation"
                      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
                    >
                      {hostJoining ? '…' : '参加'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-[0.74rem] text-[var(--kg-gold)]" style={{ letterSpacing: '0.06em' }}>
                <span aria-hidden className="mr-1">✓</span> ホストとして参加中
              </p>
            )}
            <PinkBtn onClick={handleAdvance} disabled={players.length === 0}>
              {t('startGame', { count: players.length })}
            </PinkBtn>
          </>
        )}

        {/* Phase B: Question */}
        {game.status === 'question' && currentQuestion && (
          <>
            <div className="flex items-center justify-between">
              <p
                className="text-[var(--kg-gold)] text-[1.5rem]"
                style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.1em' }}
              >
                {t('questionCounter', { current: game.currentQuestionIndex + 1, total: game.questions.length })}
              </p>
              {game.currentQuestionStartedAt && (
                <div className="w-48">
                  <CountdownTimer
                    startedAt={game.currentQuestionStartedAt}
                    timeLimitSec={currentQuestion.timeLimitSec}
                    onExpired={handleAdvance}
                  />
                </div>
              )}
            </div>

            <div className="kg-card flex flex-col gap-3 p-4">
              <p className="kg-h text-[1.2rem] leading-relaxed">
                {currentQuestion.text}
              </p>
              {currentQuestion.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question image"
                  className="max-h-64 object-contain border border-[rgba(var(--kg-paper-rgb),.14)]"
                />
              )}
            </div>

            {showVoteBar && (
              <VoteBar options={currentQuestion.options} votes={currentVotes} />
            )}
            {hostParticipating && !hostAnswered && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-center text-[0.7rem] text-[var(--kg-mist)]" style={{ letterSpacing: '0.1em' }}>あなたの回答</p>
                {currentQuestion.options.map((opt: string, i: number) => {
                  const selected = hostSelectedChoice?.questionId === currentQuestion.id && hostSelectedChoice.choiceIndex === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleHostAnswer(i)}
                      disabled={hostSubmitting}
                      className={[
                        'min-h-[48px] w-full border text-[0.9rem] transition-colors duration-300 touch-manipulation',
                        selected
                          ? 'bg-[var(--kg-accent)] text-[var(--kg-paper)] border-[var(--kg-accent)]'
                          : 'bg-[var(--kg-sumi)] text-[var(--kg-paper)]/85 border-[rgba(var(--kg-paper-rgb),.14)] hover:border-[rgba(var(--kg-paper-rgb),.4)]',
                      ].join(' ')}
                      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            <PinkBtn onClick={handleAdvance} outline>
              {t('skipToResults')}
            </PinkBtn>
          </>
        )}

        {/* Phase C: Reveal */}
        {game.status === 'reveal' && currentQuestion && (
          <>
            <div className="kg-card p-4">
              <p className="mb-1 text-[0.62rem] uppercase text-[var(--kg-gold)]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.2em' }}>
                {t('questionCounter', { current: game.currentQuestionIndex + 1, total: game.questions.length })}
              </p>
              <p className="kg-h text-[1.2rem] leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            <VoteBar
              options={currentQuestion.options}
              votes={currentVotes}
              correctIndex={currentQuestion.correctIndex}
              showCorrect={game.mode === 'trivia'}
            />

            {game.mode === 'trivia' && scores.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-[var(--kg-paper)] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  {t('top5')}
                </h2>
                <Leaderboard scores={scores} limit={5} />
              </div>
            )}

            <PinkBtn onClick={handleAdvance}>
              {game.currentQuestionIndex < game.questions.length - 1
                ? t('nextQuestion')
                : t('showFinalResults')}
            </PinkBtn>
          </>
        )}

        {/* Phase D: Ended */}
        {game.status === 'ended' && (
          <>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span aria-hidden className="block h-px w-12 bg-[var(--kg-accent)]" />
              <h2 className="text-[var(--kg-paper)] text-[3rem] leading-none" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.4)' }}>
                {t('gameOver')}
              </h2>
              <p className="text-[0.82rem] text-[var(--kg-mist)]">{game.title}</p>
            </div>

            {game.mode === 'trivia' && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[var(--kg-paper)] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  {t('finalLeaderboard')}
                </h3>
                <Leaderboard scores={scores} />
              </div>
            )}

            {game.mode === 'polling' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-[var(--kg-paper)] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  {t('results')}
                </h3>
                {game.questions.map((q: Question, i: number) => {
                  const qAnswers = answers.filter((a: Answer) => a.questionId === q.id);
                  const votes = q.options.map((_: string, optIdx: number) =>
                    qAnswers.filter((a: Answer) => a.choiceIndex === optIdx).length
                  );
                  return (
                    <div key={q.id} className="flex flex-col gap-2">
                      <p className="kg-h text-[0.92rem] leading-snug">{i + 1}. {q.text}</p>
                      <VoteBar options={q.options} votes={votes} />
                    </div>
                  );
                })}
              </div>
            )}

            {game.mode === 'polling' && players.length > 0 && (() => {
              const personResults = computePersonVoteResults(game.questions, answers, players);
              if (!personResults) return null;
              const maxVotes = Math.max(...personResults.map(r => r.voteCount), 1);
              return (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-[0.66rem] uppercase text-[var(--kg-mist)]" style={{ letterSpacing: '0.16em' }}>選ばれた回数</p>
                  {personResults.map((r, i) => (
                    <div key={r.displayName} className="kg-card flex items-center gap-3 px-3 py-2.5">
                      <span className="w-6 text-center text-[1rem] text-[var(--kg-gold)]" style={{ fontFamily: 'var(--font-bebas)' }}>{i + 1}</span>
                      <span className="kg-h flex-1 truncate text-[0.9rem]">{r.displayName}</span>
                      <div className="h-1.5 w-20 overflow-hidden bg-[rgba(var(--kg-paper-rgb),.1)]">
                        <div className="h-full bg-[var(--kg-accent)]" style={{ width: `${(r.voteCount / maxVotes) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-[0.82rem] text-[var(--kg-paper)]">{r.voteCount}票</span>
                      {i === 0 && r.voteCount > 0 && <span aria-hidden className="text-[var(--kg-gold)]" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>}
                    </div>
                  ))}
                </div>
              );
            })()}

            {game.mode === 'polling' && players.length > 0 && (() => {
              const results = computePollingResults(game.questions, answers, players);
              if (results.length === 0) return null;
              const topMajority = results[0];
              const topMinority = [...results].sort((a, b) => b.minorityCount - a.minorityCount)[0];
              return (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-[0.66rem] uppercase text-[var(--kg-mist)]" style={{ letterSpacing: '0.16em' }}>みんなの実態まとめ</p>
                  {results.map((r, i) => (
                    <div key={r.playerId} className="kg-card flex items-center gap-3 px-3 py-2.5">
                      <span className="w-6 text-center text-[1rem] text-[var(--kg-gold)]" style={{ fontFamily: 'var(--font-bebas)' }}>{i + 1}</span>
                      <span className="kg-h flex-1 truncate text-[0.9rem]">{r.displayName}</span>
                      {r.playerId === topMajority.playerId && <span className="border border-[rgba(var(--kg-gold-rgb),.5)] px-2 py-0.5 text-[0.62rem] text-[var(--kg-gold)]" style={{ letterSpacing: '0.06em' }}>多数派王</span>}
                      {r.playerId === topMinority.playerId && r.playerId !== topMajority.playerId && <span className="border border-[var(--kg-accent)]/50 px-2 py-0.5 text-[0.62rem] text-[var(--kg-accent)]" style={{ letterSpacing: '0.06em' }}>少数派</span>}
                      <span className="text-[0.68rem] text-[var(--kg-mist)]">{r.majorityCount}勝 / {r.minorityCount}負</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {game.mode === 'opinion' && opinionResults.length > 0 && (() => {
              const maxLoss = opinionResults[0].lossCount;
              const minLoss = opinionResults[opinionResults.length - 1].lossCount;
              return (
                <div className="flex flex-col gap-4">
                  <div className="text-center">
                    <h3 className="text-[var(--kg-paper)] text-[2.6rem] leading-none" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(var(--kg-accent-rgb),.4)' }}>
                      {t('opinionReveal')}
                    </h3>
                    <p className="mt-2 text-[0.78rem] text-[var(--kg-mist)]" style={{ letterSpacing: '0.04em' }}>
                      {game.loseRule === 'majority' ? t('opinionMajorityRule') : t('opinionMinorityRule')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {opinionResults.map((r) => {
                      const isLoser = r.lossCount === maxLoss && maxLoss > 0;
                      const isWinner = r.lossCount === minLoss && opinionResults.length > 1;
                      return (
                        <div key={r.playerId}
                          className={[
                            'flex flex-col items-center gap-1.5 border p-4 text-center transition-colors',
                            isLoser
                              ? 'bg-[var(--kg-accent)] border-[var(--kg-accent)] text-[var(--kg-paper)]'
                              : isWinner
                              ? 'bg-[var(--kg-sumi)] border-[rgba(var(--kg-gold-rgb),.5)] text-[var(--kg-paper)]'
                              : 'bg-[var(--kg-sumi)] border-[rgba(var(--kg-paper-rgb),.1)] text-[var(--kg-paper)]',
                          ].join(' ')}
                        >
                          <span aria-hidden className={['text-[0.9rem]', isWinner ? 'text-[var(--kg-gold)]' : isLoser ? 'text-[var(--kg-paper)]' : 'text-[var(--kg-mist)]'].join(' ')} style={{ fontFamily: 'var(--font-bebas)' }}>
                            {isLoser ? '✕' : isWinner ? '◆' : '·'}
                          </span>
                          <span className="kg-h text-[0.9rem] leading-tight">
                            {r.displayName}
                          </span>
                          <span className={['text-[0.7rem]', isLoser ? 'text-[var(--kg-paper)]/80' : 'text-[var(--kg-mist)]'].join(' ')}>
                            {t('opinionLoseCount', { count: r.lossCount })}
                          </span>
                          {isLoser && (
                            <span className="mt-1 border border-[var(--kg-paper)]/40 px-2 py-0.5 text-[0.62rem] text-[var(--kg-paper)]" style={{ letterSpacing: '0.08em' }}>
                              {t('opinionLoser')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-3">
              <Link
                href="/presets"
                className="flex w-full min-h-[56px] items-center justify-center gap-2 bg-[var(--kg-accent)] text-[var(--kg-paper)] transition-colors duration-300 hover:bg-[var(--kg-accent-hover)] active:bg-[var(--kg-accent-deep)] touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', boxShadow: '0 14px 40px rgba(var(--kg-accent-rgb),.24)' }}
              >
                <span>プリセット一覧へ</span>
                <span aria-hidden>→</span>
              </Link>
              <Link
                href="/host/new"
                className="flex min-h-[48px] w-full items-center justify-center border border-[rgba(var(--kg-gold-rgb),.45)] text-[0.86rem] text-[var(--kg-gold)] transition-colors duration-300 hover:border-[var(--kg-gold)] hover:bg-[var(--kg-gold)]/5 touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
              >
                ＋ 新しく作る
              </Link>
            </div>
          </>
        )}

        {/* Draft fallback */}
        {game.status === 'draft' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-[0.82rem] text-[var(--kg-mist)]">{t('openingLobby')}</p>
            <PinkBtn onClick={handleAdvance}>{t('openLobby')}</PinkBtn>
          </div>
        )}
      </div>
    </main>
  );
}
