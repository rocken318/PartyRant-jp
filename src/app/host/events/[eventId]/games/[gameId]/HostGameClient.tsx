'use client';

import { useCallback, useEffect, useReducer } from 'react';
import Link from 'next/link';
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
    case 'ANSWER_SUBMITTED': {
      const exists = state.answers.some(
        (a) => a.playerId === action.answer.playerId && a.questionId === action.answer.questionId
      );
      return {
        ...state,
        answers: exists
          ? state.answers.map((a) =>
              a.playerId === action.answer.playerId && a.questionId === action.answer.questionId
                ? action.answer
                : a
            )
          : [...state.answers, action.answer],
      };
    }
    case 'SCORES_LOADED':
      return { ...state, scores: action.scores };
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
  game: null, players: [], answers: [], scores: [], loading: true, error: null,
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

async function advanceGame(gameId: string): Promise<Game | null> {
  const res = await fetch(`/api/games/${gameId}/advance`, { method: 'POST' });
  if (!res.ok) return null;
  return res.json() as Promise<Game>;
}

async function resetGame(gameId: string): Promise<Game | null> {
  const res = await fetch(`/api/games/${gameId}/reset`, { method: 'POST' });
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
          ? 'border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 hover:border-[rgba(236,231,223,.4)]'
          : 'bg-[#cf3a2e] text-[#ece7df] hover:bg-[#d8483c] active:bg-[#a12417]',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].filter(Boolean).join(' ')}
      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', ...(outline ? {} : { boxShadow: '0 14px 40px rgba(207,58,46,.24)' }) }}
    >
      {children}
    </button>
  );
}

export function HostGameClient({ eventId, gameId }: { eventId: string; gameId: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { game, players, answers, scores, loading, error } = state;

  useEffect(() => {
    const load = async () => {
      try {
        const [gameRes, playersRes, answersRes] = await Promise.all([
          fetch(`/api/games/${gameId}`),
          fetch(`/api/games/${gameId}/players`),
          fetch(`/api/games/${gameId}/answers`),
        ]);
        if (!gameRes.ok) throw new Error('Game not found');
        const gameData = await gameRes.json() as Game;
        const playersData = playersRes.ok ? await playersRes.json() as Player[] : [];
        const answersData = answersRes.ok ? await answersRes.json() as Answer[] : [];
        dispatch({ type: 'LOADED', game: gameData, players: playersData, answers: answersData });
      } catch (e) {
        dispatch({ type: 'ERROR', message: e instanceof Error ? e.message : 'Failed to load game' });
      }
    };
    load();
  }, [gameId]);

  // Poll players every 3s while in lobby — SSE may be unreliable for joins
  useEffect(() => {
    if (!game || game.status !== 'lobby') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/players`);
        if (!res.ok) return;
        const latest = await res.json() as Player[];
        latest.forEach(p => dispatch({ type: 'PLAYER_JOINED', player: p }));
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, game?.status]);

  useEffect(() => {
    if (!game) return;
    if ((game.status === 'reveal' || game.status === 'ended') && game.mode === 'trivia') {
      dispatch({ type: 'SCORES_LOADED', scores: computeScores(game, players, answers) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, answers.length, players.length]);

  const handleEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case 'connected':
        Promise.all([
          fetch(`/api/games/${gameId}`).then(r => r.ok ? r.json() as Promise<Game> : Promise.reject()),
          fetch(`/api/games/${gameId}/players`).then(r => r.ok ? r.json() as Promise<Player[]> : Promise.resolve([])),
          fetch(`/api/games/${gameId}/answers`).then(r => r.ok ? r.json() as Promise<Answer[]> : Promise.resolve([])),
        ]).then(([game, players, answers]) => {
          dispatch({ type: 'SYNCED', game, players, answers });
        }).catch(() => {});
        break;
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

  const handleReset = async () => {
    if (!confirm('Reset this game? All players and answers will be deleted.')) return;
    const updated = await resetGame(gameId);
    if (updated) dispatch({ type: 'LOADED', game: updated, players: [], answers: [] });
  };

  if (loading) {
    return (
      <div className="kg-page kg-grain flex flex-1 items-center justify-center min-h-screen">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#cf3a2e] border-t-transparent" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="kg-page kg-grain flex flex-1 flex-col items-center justify-center min-h-screen gap-4 px-4">
        <p className="text-[0.9rem] text-[#cf3a2e]">{error ?? 'Game not found'}</p>
        <Link href={`/host/events/${eventId}`} className={buttonVariants({ variant: 'outline' })}>
          Back to event
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

  return (
    <main className="kg-page kg-grain flex flex-col min-h-screen">
      {/* Sticky ink header */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[rgba(236,231,223,.12)] bg-[#0a0a0b]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={`/host/events/${eventId}`} aria-label="←" className="flex h-9 w-9 items-center justify-center text-[#ece7df]/70 transition-colors hover:text-[#ece7df] touch-manipulation">
            <span aria-hidden className="text-lg">←</span>
          </Link>
          <div className="flex flex-col">
            <h1
              className="kg-h max-w-[200px] truncate text-[1.15rem] leading-tight sm:max-w-none"
            >
              {game.title}
            </h1>
            <p className="text-[0.62rem] uppercase capitalize text-[#7d7871]" style={{ letterSpacing: '0.16em' }}>{game.mode}</p>
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
            <PinkBtn onClick={handleAdvance} disabled={players.length === 0}>
              <span>Start game ({players.length} player{players.length !== 1 ? 's' : ''})</span>
              <span aria-hidden>→</span>
            </PinkBtn>
          </>
        )}

        {/* Phase B: Question */}
        {game.status === 'question' && currentQuestion && (
          <>
            <div className="flex items-center justify-between">
              <p
                className="text-[#b8935a] text-[1.5rem]"
                style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.1em' }}
              >
                Q {game.currentQuestionIndex + 1}/{game.questions.length}
              </p>
              {game.currentQuestionStartedAt && (
                <div className="w-48">
                  <CountdownTimer
                    startedAt={game.currentQuestionStartedAt}
                    timeLimitSec={currentQuestion.timeLimitSec + (game.mode === 'trivia' ? 10 : 0)}
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
                  className="max-h-64 object-contain border border-[rgba(236,231,223,.14)]"
                />
              )}
            </div>

            <VoteBar options={currentQuestion.options} votes={currentVotes} />

            <PinkBtn onClick={handleAdvance} outline>
              <span>Skip to results</span>
              <span aria-hidden>→</span>
            </PinkBtn>
          </>
        )}

        {/* Phase C: Reveal */}
        {game.status === 'reveal' && currentQuestion && (
          <>
            <div className="kg-card p-4">
              <p className="mb-1 text-[0.62rem] uppercase text-[#b8935a]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.2em' }}>
                Q {game.currentQuestionIndex + 1}/{game.questions.length}
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
                <h2 className="text-[#ece7df] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  Top 5
                </h2>
                <Leaderboard scores={scores} limit={5} />
              </div>
            )}

            <PinkBtn onClick={handleAdvance}>
              <span>
                {game.currentQuestionIndex < game.questions.length - 1
                  ? 'Next question'
                  : 'Show final results'}
              </span>
              <span aria-hidden>→</span>
            </PinkBtn>
          </>
        )}

        {/* Phase D: Ended */}
        {game.status === 'ended' && (
          <>
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span aria-hidden className="block h-px w-12 bg-[#cf3a2e]" />
              <h2 className="text-[#ece7df] text-[3rem] leading-none" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(207,58,46,.4)' }}>
                Game Over
              </h2>
              <p className="text-[0.82rem] text-[#7d7871]">{game.title}</p>
            </div>

            {game.mode === 'trivia' && (
              <div className="flex flex-col gap-3">
                <h3 className="text-[#ece7df] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  Final leaderboard
                </h3>
                <Leaderboard scores={scores} />
              </div>
            )}

            {game.mode === 'polling' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-[#ece7df] text-[1.6rem]" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.08em' }}>
                  Results
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

            <PinkBtn onClick={handleReset} outline>
              <span>Reset game</span>
            </PinkBtn>
            <Link
              href={`/host/events/${eventId}/games/new`}
              className="flex w-full min-h-[56px] items-center justify-center gap-2 bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 hover:bg-[#d8483c] active:bg-[#a12417] touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.12em', boxShadow: '0 14px 40px rgba(207,58,46,.24)' }}
            >
              <span>Create another game</span>
              <span aria-hidden>→</span>
            </Link>
          </>
        )}

        {/* Draft fallback */}
        {game.status === 'draft' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-[0.82rem] text-[#7d7871]">Opening lobby...</p>
            <PinkBtn onClick={handleAdvance}>Open lobby</PinkBtn>
          </div>
        )}
      </div>
    </main>
  );
}
