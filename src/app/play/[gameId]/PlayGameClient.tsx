'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { JoinCodeDisplay } from '@/components/JoinCodeDisplay';
import { GameQRCode } from '@/components/GameQRCode';
import { PlayerList } from '@/components/PlayerList';
import { CountdownTimer } from '@/components/CountdownTimer';
import { VoteBar } from '@/components/VoteBar';
import { AnswerButton } from '@/components/AnswerButton';
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
    if (nonZero.length <= 1) continue;
    const threshold = loseRule === 'minority' ? Math.min(...nonZero) : Math.max(...nonZero);
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
        'w-full h-14 text-lg font-bold rounded-[6px] border-[3px] border-pr-dark touch-manipulation',
        outline
          ? 'bg-white text-pr-dark shadow-[4px_4px_0_#111] hover:shadow-[5px_5px_0_#111]'
          : 'bg-pr-pink text-white shadow-[5px_5px_0_#111]',
        'active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].filter(Boolean).join(' ')}
      style={{ fontFamily: 'var(--font-dm)' }}
    >
      {children}
    </button>
  );
}

function computePollingResults(
  questions: Question[],
  answers: Answer[],
  players: Player[]
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

function isPersonVoteQuestion(options: string[], playerNames: Set<string>): boolean {
  return options.length > 0 && options.every(opt => playerNames.has(opt));
}

function computePersonVoteResults(
  questions: Question[],
  answers: Answer[],
  players: Player[]
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

// キャスト指名ゲーム用: オプション名ベースで集計（参加プレイヤーと無関係）
function computeOptionVoteResults(
  questions: Question[],
  answers: Answer[]
): { optionName: string; voteCount: number }[] | null {
  const voteMap = new Map<string, number>();
  for (const q of questions) {
    for (const opt of q.options) if (!voteMap.has(opt)) voteMap.set(opt, 0);
    for (const ans of answers.filter(a => a.questionId === q.id)) {
      const opt = q.options[ans.choiceIndex];
      if (opt !== undefined) voteMap.set(opt, (voteMap.get(opt) ?? 0) + 1);
    }
  }
  if (voteMap.size === 0) return null;
  return Array.from(voteMap.entries())
    .map(([optionName, voteCount]) => ({ optionName, voteCount }))
    .sort((a, b) => b.voteCount - a.voteCount);
}

export function PlayGameClient({ gameId }: { gameId: string }) {
  const t = useTranslations('hostGame');
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { game, players, answers, scores, opinionResults, loading, error } = state;

  const [hostParticipating, setHostParticipating] = useState(false);
  const [hostNameInput, setHostNameInput] = useState('');
  const [hostShowInput, setHostShowInput] = useState(false);
  const [hostJoining, setHostJoining] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);
  const [hostAnsweredIds, setHostAnsweredIds] = useState<Set<string>>(new Set());
  const [hostSelectedChoice, setHostSelectedChoice] = useState<number | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);
  const [castNames, setCastNames] = useState<string[]>(['']);
  const [castSaved, setCastSaved] = useState(false);
  const [castSaving, setCastSaving] = useState(false);

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

  useEffect(() => {
    setHostSelectedChoice(null);
  }, [game?.currentQuestionIndex]);

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
      case 'question_started':
        if (event.game) dispatch({ type: 'GAME_UPDATED', game: event.game });
        dispatch({ type: 'QUESTION_STARTED', questionIndex: event.questionIndex, startedAt: event.startedAt });
        break;
      case 'question_ended': dispatch({ type: 'QUESTION_ENDED' }); break;
      case 'answer_submitted': dispatch({ type: 'ANSWER_SUBMITTED', answer: event.answer }); break;
    }
  }, [gameId]);

  useGameStream(gameId, handleEvent);

  const handleAdvance = async () => {
    const updated = await advanceGame(gameId);
    if (updated) dispatch({ type: 'GAME_UPDATED', game: updated });
  };

  async function handleNextGame() {
    const res = await fetch(`/api/games/${gameId}/next`, { method: 'POST' });
    if (res.ok) {
      const newGame = await res.json() as import('@/types/domain').Game;
      router.push(`/play/${newGame.id}`);
    }
  }

  async function handleSaveCast() {
    const names = castNames.map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setCastSaving(true);
    try {
      const res = await fetch(`/api/games/${gameId}/cast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ castNames: names }),
      });
      if (res.ok) {
        const data = await res.json() as { questions: import('@/types/domain').Question[] };
        if (game) dispatch({ type: 'GAME_UPDATED', game: { ...game, questions: data.questions } });
        setCastSaved(true);
        setCastNames(names);
      }
    } finally {
      setCastSaving(false);
    }
  }

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
    setHostSelectedChoice(choiceIndex);
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
      <div className="flex flex-1 items-center justify-center min-h-screen bg-white">
        <div className="w-12 h-12 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen gap-4 px-4 bg-white">
        <p className="text-red-500 font-bold">{error ?? t('notFound')}</p>
        <Link href="/presets" className={buttonVariants({ variant: 'outline' })}>
          {t('backToPresets')}
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

  const showVoteBar = !hostParticipating || game.status !== 'question' || hostAnswered;

  const isCastGame = game.scene === 'この中で●●なのは誰だ' &&
    game.questions.some(q => q.options.some((opt: string) => /^[A-Z]さん$/.test(opt) || /^プレイヤー[A-Z]$/.test(opt)));

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Sticky dark header */}
      <header className="sticky top-0 z-10 bg-pr-dark px-4 py-3 flex items-center justify-between gap-3 border-b-[3px] border-pr-dark">
        <div className="flex flex-col">
          <h1
            className="text-pr-pink truncate max-w-[200px] sm:max-w-none"
            style={{ fontFamily: 'var(--font-bebas)', fontSize: '1.6rem', lineHeight: 1 }}
          >
            {game.title}
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest capitalize">{game.mode}</p>
        </div>
        <GameStatusBadge status={game.status} />
      </header>

      <div className="flex-1 max-w-[720px] w-full mx-auto px-4 py-6 flex flex-col gap-6">

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
                    className="w-full h-11 bg-white text-pr-dark font-bold text-sm rounded-[6px] border-[2px] border-pr-dark shadow-[2px_2px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)' }}
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
                      className="flex-1 h-11 px-3 rounded-[6px] border-[2px] border-pr-dark text-pr-dark font-bold text-sm focus:outline-none"
                      style={{ fontFamily: 'var(--font-dm)' }}
                    />
                    <button
                      type="button"
                      onClick={handleHostJoin}
                      disabled={!hostNameInput.trim() || hostJoining}
                      className="h-11 px-4 bg-pr-dark text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark shadow-[2px_2px_0_#111] disabled:opacity-50 touch-manipulation"
                      style={{ fontFamily: 'var(--font-dm)' }}
                    >
                      {hostJoining ? '…' : '参加'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-center text-gray-400">✓ ホストとして参加中</p>
            )}
            {/* キャスト指名ゲーム用: プレースホルダーがある場合のみ表示 */}
            {isCastGame && (
              <div className="flex flex-col gap-2 p-3 bg-gray-50 border-[2px] border-dashed border-pr-dark rounded-[8px]">
                <p className="text-xs font-bold text-pr-dark uppercase tracking-widest">👤 キャストを設定</p>
                {castSaved ? (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-pr-dark">{castNames.join(' / ')}</p>
                    <button type="button" onClick={() => setCastSaved(false)}
                      className="text-xs text-gray-400 underline touch-manipulation"
                      style={{ fontFamily: 'var(--font-dm)' }}>変更</button>
                  </div>
                ) : (
                  <>
                    {castNames.map((name, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={name}
                          onChange={e => {
                            const next = [...castNames];
                            next[i] = e.target.value;
                            if (i === castNames.length - 1 && e.target.value) next.push('');
                            setCastNames(next);
                          }}
                          placeholder={`キャスト ${i + 1}`}
                          maxLength={20}
                          className="flex-1 h-10 px-3 rounded-[6px] border-[2px] border-pr-dark text-pr-dark font-bold text-sm focus:outline-none"
                          style={{ fontFamily: 'var(--font-dm)' }}
                        />
                        {castNames.length > 1 && (
                          <button type="button"
                            onClick={() => setCastNames(castNames.filter((_, j) => j !== i))}
                            className="w-10 h-10 text-gray-400 font-bold text-lg touch-manipulation">×</button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleSaveCast}
                      disabled={castNames.every(n => !n.trim()) || castSaving}
                      className="h-10 bg-pr-dark text-white font-bold text-sm rounded-[6px] border-[2px] border-pr-dark disabled:opacity-50 touch-manipulation"
                      style={{ fontFamily: 'var(--font-dm)' }}
                    >
                      {castSaving ? '保存中...' : '✓ キャストを確定'}
                    </button>
                  </>
                )}
              </div>
            )}
            {players.length === 0 && (
              <p className="text-xs text-center text-gray-400">ホストも参加するか、ゲストの参加を待ってください</p>
            )}
            <PinkBtn
              onClick={handleAdvance}
              disabled={players.length === 0 || (isCastGame && !castSaved)}
            >
              {t('startGame', { count: players.length })}
            </PinkBtn>
          </>
        )}

        {/* Phase B: Question */}
        {game.status === 'question' && currentQuestion && (
          <>
            <div className="flex items-center justify-between">
              <p
                className="text-pr-dark text-2xl"
                style={{ fontFamily: 'var(--font-bebas)' }}
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

            <div className="flex flex-col gap-3 p-4 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111]">
              <p className="text-xl font-bold text-pr-dark" style={{ fontFamily: 'var(--font-dm)' }}>
                {currentQuestion.text}
              </p>
              {currentQuestion.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentQuestion.imageUrl}
                  alt="Question image"
                  className="max-h-64 rounded-[6px] object-contain border-[2px] border-pr-dark"
                />
              )}
            </div>

            {showVoteBar && (
              <VoteBar options={currentQuestion.options} votes={currentVotes} />
            )}
            {hostParticipating && !hostAnswered && (
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs font-bold text-gray-400 text-center">あなたの回答</p>
                {currentQuestion.options.map((opt: string, i: number) => (
                  <AnswerButton
                    key={i}
                    label={opt}
                    index={i}
                    selected={hostSelectedChoice === i}
                    disabled={hostSubmitting}
                    onClick={() => handleHostAnswer(i)}
                  />
                ))}
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
            <div className="p-4 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111]">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                {t('questionCounter', { current: game.currentQuestionIndex + 1, total: game.questions.length })}
              </p>
              <p className="text-xl font-bold text-pr-dark" style={{ fontFamily: 'var(--font-dm)' }}>
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
                <h2 className="text-pr-dark text-3xl" style={{ fontFamily: 'var(--font-bebas)' }}>
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
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="text-6xl">🎉</span>
              <h2 className="text-pr-dark text-6xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                {t('gameOver')}
              </h2>
              <p className="text-gray-500 font-bold">{game.title}</p>
            </div>

            {game.mode === 'trivia' && (
              <div className="flex flex-col gap-3">
                <h3 className="text-pr-dark text-3xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                  {t('finalLeaderboard')}
                </h3>
                <Leaderboard scores={scores} />
              </div>
            )}

            {game.mode === 'polling' && (
              <div className="flex flex-col gap-6">
                <h3 className="text-pr-dark text-3xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                  {t('results')}
                </h3>
                {game.questions.map((q: Question, i: number) => {
                  const qAnswers = answers.filter((a: Answer) => a.questionId === q.id);
                  const votes = q.options.map((_: string, optIdx: number) =>
                    qAnswers.filter((a: Answer) => a.choiceIndex === optIdx).length
                  );
                  return (
                    <div key={q.id} className="flex flex-col gap-2">
                      <p className="font-bold text-sm text-pr-dark">{i + 1}. {q.text}</p>
                      <VoteBar options={q.options} votes={votes} />
                    </div>
                  );
                })}
                {(() => {
                  // キャスト指名ゲーム: オプション名ベース集計
                  if (game.scene === 'この中で●●なのは誰だ') {
                    const optResults = computeOptionVoteResults(game.questions, answers);
                    if (!optResults) return null;
                    const maxVotes = Math.max(...optResults.map(r => r.voteCount), 1);
                    return (
                      <div className="flex flex-col gap-2 mt-2">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">選ばれた回数</p>
                        {optResults.map((r, i) => (
                          <div key={r.optionName} className="flex items-center gap-3 bg-white rounded-[8px] border-[2px] border-pr-dark px-3 py-2 shadow-[2px_2px_0_#111]">
                            <span className="text-lg font-bold text-pr-dark w-6 text-center">{i + 1}</span>
                            <span className="flex-1 font-bold text-pr-dark text-sm truncate">{r.optionName}</span>
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-pr-pink rounded-full" style={{ width: `${(r.voteCount / maxVotes) * 100}%` }} />
                            </div>
                            <span className="text-sm font-bold text-pr-dark w-10 text-right">{r.voteCount}票</span>
                            {i === 0 && r.voteCount > 0 && <span className="text-lg">👑</span>}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  // その他の polling: プレイヤー名ベース集計
                  if (players.length === 0) return null;
                  const personResults = computePersonVoteResults(game.questions, answers, players);
                  if (!personResults) return null;
                  const maxVotes = Math.max(...personResults.map(r => r.voteCount), 1);
                  return (
                    <div className="flex flex-col gap-2 mt-2">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">選ばれた回数</p>
                      {personResults.map((r, i) => (
                        <div key={r.displayName} className="flex items-center gap-3 bg-white rounded-[8px] border-[2px] border-pr-dark px-3 py-2 shadow-[2px_2px_0_#111]">
                          <span className="text-lg font-bold text-pr-dark w-6 text-center">{i + 1}</span>
                          <span className="flex-1 font-bold text-pr-dark text-sm truncate">{r.displayName}</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-pr-pink rounded-full" style={{ width: `${(r.voteCount / maxVotes) * 100}%` }} />
                          </div>
                          <span className="text-sm font-bold text-pr-dark w-10 text-right">{r.voteCount}票</span>
                          {i === 0 && r.voteCount > 0 && <span className="text-lg">👑</span>}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {game.scene !== 'この中で●●なのは誰だ' && players.length > 0 && (() => {
                  const results = computePollingResults(game.questions, answers, players);
                  if (results.length === 0) return null;
                  const topMajority = results[0];
                  const topMinority = [...results].sort((a, b) => b.minorityCount - a.minorityCount)[0];
                  return (
                    <div className="flex flex-col gap-2 mt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">みんなの実態まとめ</p>
                      {results.map((r, i) => (
                        <div key={r.playerId} className="flex items-center gap-3 bg-white rounded-[8px] border-[2px] border-pr-dark px-3 py-2 shadow-[2px_2px_0_#111]">
                          <span className="text-lg font-bold text-pr-dark w-6 text-center">{i + 1}</span>
                          <span className="flex-1 font-bold text-pr-dark text-sm truncate">{r.displayName}</span>
                          {r.playerId === topMajority.playerId && <span className="text-xs font-bold bg-pr-pink text-white px-2 py-0.5 rounded-full">多数派王</span>}
                          {r.playerId === topMinority.playerId && r.playerId !== topMajority.playerId && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">少数派</span>}
                          <span className="text-xs text-gray-500 font-bold">{r.majorityCount}勝 / {r.minorityCount}負</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {game.mode === 'opinion' && opinionResults.length > 0 && (() => {
              const maxLoss = opinionResults[0].lossCount;
              const minLoss = opinionResults[opinionResults.length - 1].lossCount;
              return (
                <div className="flex flex-col gap-4">
                  <div className="text-center">
                    <h3 className="text-pr-dark text-5xl" style={{ fontFamily: 'var(--font-bebas)' }}>
                      {t('opinionReveal')}
                    </h3>
                    <p className="text-gray-500 text-sm font-bold mt-1">
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
                            'flex flex-col items-center gap-1 p-4 rounded-[8px] border-[3px] text-center',
                            isLoser
                              ? 'bg-red-500 border-red-700 shadow-[4px_4px_0_#7f1d1d] text-white'
                              : isWinner
                              ? 'bg-yellow-50 border-yellow-400 shadow-[3px_3px_0_#a16207] text-pr-dark'
                              : 'bg-white border-pr-dark shadow-[3px_3px_0_#111] text-pr-dark',
                          ].join(' ')}
                        >
                          <span className="text-2xl">{isLoser ? '💀' : isWinner ? '👑' : '😐'}</span>
                          <span className="font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                            {r.displayName}
                          </span>
                          <span className={['text-xs font-bold', isLoser ? 'text-red-100' : 'text-gray-500'].join(' ')}>
                            {t('opinionLoseCount', { count: r.lossCount })}
                          </span>
                          {isLoser && (
                            <span className="text-xs font-bold bg-red-700 text-white px-2 py-0.5 rounded-full mt-1">
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

            {/* センキャバ バナー */}
            <a
              href="https://www.sencaba.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-pr-dark rounded-[10px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] px-4 py-3"
            >
              <span className="text-2xl">🥂</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                  キャバクラ探しなら <span className="text-pr-pink">センキャバ</span>
                </p>
                <p className="text-gray-400 text-xs mt-0.5">お店を探す・予約する</p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold bg-pr-pink text-white px-3 py-1.5 rounded-full">DL</span>
            </a>

            <button
              type="button"
              onClick={handleNextGame}
              className="w-full h-14 bg-pr-pink text-white flex items-center justify-center text-lg font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              🔄 もう一度
            </button>
            <Link
              href="/presets"
              className="w-full h-12 bg-white text-pr-dark flex items-center justify-center font-bold text-sm rounded-[6px] border-[2px] border-pr-dark shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[1px] active:translate-y-[1px] transition-[transform,box-shadow] duration-75 touch-manipulation"
              style={{ fontFamily: 'var(--font-dm)' }}
            >
              {t('backToPresets')}
            </Link>
          </>
        )}

        {/* Draft fallback */}
        {game.status === 'draft' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-gray-500 font-bold">{t('openingLobby')}</p>
            <PinkBtn onClick={handleAdvance}>{t('openLobby')}</PinkBtn>
          </div>
        )}
      </div>
    </main>
  );
}
