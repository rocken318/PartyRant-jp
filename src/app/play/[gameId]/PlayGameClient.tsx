'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import { isScored } from '@/lib/game-logic';

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
    // fixed かつ correctIndex がある設問のみ採点（answerTarget 未定義=fixed 扱いで後方互換）
    if (!isScored(question)) continue;
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
      className={outline ? 'kg-btn kg-btn--ghost' : 'kg-btn kg-btn--primary'}
      style={{ minHeight: '56px' }}
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

// casts: キャスト名（option 名）ベースで集計する設問を含むゲームか。
// answerTarget==='casts' の設問を持つゲームで判定する。
function isCastVoteGame(game: Game): boolean {
  return game.questions.some(q => q.answerTarget === 'casts');
}

function computePersonVoteResults(
  questions: Question[],
  answers: Answer[],
  players: Player[]
): { displayName: string; voteCount: number }[] | null {
  const playerNames = new Set(players.map(p => p.displayName));
  // answerTarget==='players' を優先、無ければ従来の名前一致判定にフォールバック。
  const personQuestions = questions.filter(q =>
    q.answerTarget === 'players' || (q.answerTarget === undefined && isPersonVoteQuestion(q.options, playerNames))
  );
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
  const [hostSelectedChoice, setHostSelectedChoice] = useState<{ questionId: string; choiceIndex: number } | null>(null);
  const [hostSubmitting, setHostSubmitting] = useState(false);

  // キャスト指名scene専用: キャスト名リスト
  const [castNames, setCastNames] = useState<string[]>(['', '']);
  const [castSaving, setCastSaving] = useState(false);
  const [castSaved, setCastSaved] = useState(false);

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
        // キャスト指名: games.casts に既にキャスト名が入っていれば castSaved を復元
        if (gameData.questions.some(q => q.answerTarget === 'casts')) {
          const saved = gameData.casts ?? [];
          if (saved.length >= 2) {
            setCastNames(saved);
            setCastSaved(true);
          }
        }
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
    if (names.length < 2) return;
    setCastSaving(true);
    try {
      const res = await fetch(`/api/games/${gameId}/cast`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      });
      if (res.ok) {
        const updated = await res.json() as import('@/types/domain').Game;
        dispatch({ type: 'GAME_UPDATED', game: updated });
        setCastSaved(true);
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
      <div className="flex flex-1 items-center justify-center min-h-screen bg-[#0a0a0b]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#cf3a2e] border-t-transparent" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-screen gap-5 px-6 bg-[#0a0a0b] text-[#ece7df]">
        <p className="text-[#cf3a2e]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}>{error ?? t('notFound')}</p>
        <Link
          href="/presets"
          className="flex items-center justify-center min-h-[48px] px-6 border border-[rgba(184,147,90,.45)] text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5"
          style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.08em' }}
        >
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


  return (
    <main className="flex flex-col min-h-screen bg-[#0a0a0b] text-[#ece7df]">
      {/* Sticky dark header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/95 backdrop-blur px-5 py-4 flex items-center justify-between gap-3 border-b border-[rgba(236,231,223,.1)]">
        <div className="flex flex-col min-w-0">
          <h1
            className="text-[#ece7df] truncate max-w-[220px] sm:max-w-none"
            style={{ fontFamily: 'var(--font-dm)', fontSize: '1.3rem', lineHeight: 1.1, letterSpacing: '0.04em' }}
          >
            {game.title}
          </h1>
          <p className="text-[#b8935a] text-[0.6rem] uppercase" style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '0.3em' }}>{game.mode}</p>
        </div>
        <GameStatusBadge status={game.status} />
      </header>

      <div className="flex-1 max-w-[720px] w-full mx-auto px-5 py-7 flex flex-col gap-6">

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
                    className="w-full min-h-[48px] text-[0.86rem] border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)] touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
                  >
                    ホストも参加する
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
                      style={{ fontFamily: 'var(--font-dm)', padding: '0.7rem 0.9rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleHostJoin}
                      disabled={!hostNameInput.trim() || hostJoining}
                      className="shrink-0 min-h-[48px] px-5 text-[0.86rem] bg-[#cf3a2e] text-[#ece7df] transition-colors duration-300 hover:bg-[#d8483c] disabled:opacity-50 touch-manipulation"
                      style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}
                    >
                      {hostJoining ? '…' : '参加'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[0.72rem] text-center text-[#b8935a]" style={{ letterSpacing: '0.08em' }}>ホストとして参加中</p>
            )}

            {/* キャスト指名: キャスト名入力（answerTarget==='casts' の設問を持つゲーム） */}
            {game.questions.some(q => q.answerTarget === 'casts') && (
              <div className="flex flex-col gap-2.5 p-5 kg-card">
                <p className="kg-label">キャスト名を入力</p>
                {castNames.map((name, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={name}
                      onChange={e => {
                        const next = [...castNames];
                        next[i] = e.target.value;
                        setCastNames(next);
                        setCastSaved(false);
                      }}
                      placeholder={`キャスト${i + 1}`}
                      maxLength={20}
                      className="kg-input flex-1"
                      style={{ fontFamily: 'var(--font-dm)', padding: '0.65rem 0.9rem' }}
                    />
                    {castNames.length > 2 && (
                      <button
                        type="button"
                        onClick={() => { setCastNames(castNames.filter((_, j) => j !== i)); setCastSaved(false); }}
                        className="text-[#7d7871] text-lg px-2 hover:text-[#cf3a2e] transition-colors"
                      >×</button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setCastNames([...castNames, '']); setCastSaved(false); }}
                    className="flex-1 min-h-[44px] text-[0.82rem] border border-[rgba(236,231,223,.16)] text-[#ece7df]/85 transition-colors duration-300 hover:border-[rgba(236,231,223,.4)] touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >追加</button>
                  <button
                    type="button"
                    onClick={handleSaveCast}
                    disabled={castSaving || castNames.filter(n => n.trim()).length < 2}
                    className="flex-1 min-h-[44px] text-[0.82rem] border border-[rgba(184,147,90,.45)] text-[#b8935a] transition-colors duration-300 hover:border-[#b8935a] hover:bg-[#b8935a]/5 disabled:opacity-50 touch-manipulation"
                    style={{ fontFamily: 'var(--font-dm)' }}
                  >{castSaving ? '保存中…' : castSaved ? '保存済み' : '確定'}</button>
                </div>
              </div>
            )}

            {players.length === 0 && (
              <p className="text-[0.72rem] text-center text-[#7d7871]" style={{ letterSpacing: '0.04em' }}>ホストも参加するか、ゲストの参加を待ってください</p>
            )}
            <PinkBtn
              onClick={handleAdvance}
              disabled={
                players.length === 0 ||
                (game.questions.some(q => q.answerTarget === 'casts') && (game.casts?.length ?? 0) < 2)
              }
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
                className="text-[#ece7df] text-[1.3rem]"
                style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.04em' }}
              >
                {t('questionCounter', { current: game.currentQuestionIndex + 1, total: game.questions.length })}
              </p>
              {game.currentQuestionStartedAt && (
                <div className="w-40">
                  <CountdownTimer
                    startedAt={game.currentQuestionStartedAt}
                    timeLimitSec={currentQuestion.timeLimitSec}
                    onExpired={handleAdvance}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 p-5 kg-card kg-card--glow">
              <p className="text-[1.2rem] text-[#ece7df]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.03em', lineHeight: 1.5 }}>
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

            {showVoteBar && (
              <VoteBar options={currentQuestion.options} votes={currentVotes} />
            )}
            {hostParticipating && !hostAnswered && (
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-[0.7rem] text-[#7d7871] text-center" style={{ letterSpacing: '0.12em' }}>あなたの回答</p>
                {currentQuestion.options.map((opt: string, i: number) => (
                  <AnswerButton
                    key={i}
                    label={opt}
                    index={i}
                    selected={hostSelectedChoice?.questionId === currentQuestion.id && hostSelectedChoice.choiceIndex === i}
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
            <div className="p-5 kg-card kg-card--glow">
              <p className="text-[0.66rem] uppercase text-[#7d7871] mb-2" style={{ letterSpacing: '0.16em' }}>
                {t('questionCounter', { current: game.currentQuestionIndex + 1, total: game.questions.length })}
              </p>
              <p className="text-[1.2rem] text-[#ece7df]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.03em', lineHeight: 1.5 }}>
                {currentQuestion.text}
              </p>
            </div>

            <VoteBar
              options={currentQuestion.options}
              votes={currentVotes}
              correctIndex={currentQuestion.correctIndex}
              showCorrect={game.mode === 'trivia' && isScored(currentQuestion)}
            />

            {game.mode === 'trivia' && scores.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="kg-h text-[1.5rem]">
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
              <span className="kg-eyebrow">Finished</span>
              <h2 className="text-[#ece7df] text-[3rem]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em', textShadow: '0 0 48px rgba(207,58,46,.4)' }}>
                {t('gameOver')}
              </h2>
              <span aria-hidden className="block h-px w-12 bg-[#cf3a2e]" />
              <p className="text-[#7d7871] text-sm" style={{ letterSpacing: '0.04em' }}>{game.title}</p>
            </div>

            {game.mode === 'trivia' && (
              <div className="flex flex-col gap-3">
                <h3 className="kg-h text-[1.5rem]">
                  {t('finalLeaderboard')}
                </h3>
                <Leaderboard scores={scores} />
              </div>
            )}

            {game.mode === 'polling' && (
              <div className="flex flex-col gap-6">
                <h3 className="kg-h text-[1.5rem]">
                  {t('results')}
                </h3>
                {game.questions.map((q: Question, i: number) => {
                  const qAnswers = answers.filter((a: Answer) => a.questionId === q.id);
                  const votes = q.options.map((_: string, optIdx: number) =>
                    qAnswers.filter((a: Answer) => a.choiceIndex === optIdx).length
                  );
                  return (
                    <div key={q.id} className="flex flex-col gap-2">
                      <p className="text-sm text-[#ece7df]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}>{i + 1}. {q.text}</p>
                      <VoteBar options={q.options} votes={votes} />
                    </div>
                  );
                })}
                {(() => {
                  // casts: キャスト名（option名）ベース集計（answerTarget 優先・scene フォールバック）
                  if (isCastVoteGame(game)) {
                    const optResults = computeOptionVoteResults(game.questions, answers);
                    if (!optResults) return null;
                    const maxVotes = Math.max(...optResults.map(r => r.voteCount), 1);
                    return (
                      <div className="flex flex-col gap-2 mt-2">
                        <p className="kg-label">選ばれた回数</p>
                        {optResults.map((r, i) => (
                          <div key={r.optionName} className="flex items-center gap-3 bg-[#111114] px-3 py-2.5" style={{ border: i === 0 && r.voteCount > 0 ? '1px solid rgba(184,147,90,.6)' : '1px solid rgba(236,231,223,.1)' }}>
                            <span className="w-6 text-center text-[1rem]" style={{ fontFamily: 'var(--font-bebas)', color: i === 0 && r.voteCount > 0 ? '#b8935a' : '#7d7871' }}>{i + 1}</span>
                            <span className="flex-1 text-[0.82rem] text-[#ece7df] truncate" style={{ fontFamily: 'var(--font-dm)' }}>{r.optionName}</span>
                            <div className="w-16 h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(236,231,223,.08)' }}>
                              <div className="h-full bg-[#cf3a2e]" style={{ width: `${(r.voteCount / maxVotes) * 100}%` }} />
                            </div>
                            <span className="text-[0.8rem] text-[#b9b4ac] w-9 text-right">{r.voteCount}票</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  // その他（この中で●●なのは誰だ含む）: 参加者名ベース集計
                  if (players.length === 0) return null;
                  const personResults = computePersonVoteResults(game.questions, answers, players);
                  if (!personResults) return null;
                  const maxVotes = Math.max(...personResults.map(r => r.voteCount), 1);
                  return (
                    <div className="flex flex-col gap-2 mt-2">
                      <p className="kg-label">選ばれた回数</p>
                      {personResults.map((r, i) => (
                        <div key={r.displayName} className="flex items-center gap-3 bg-[#111114] px-3 py-2.5" style={{ border: i === 0 && r.voteCount > 0 ? '1px solid rgba(184,147,90,.6)' : '1px solid rgba(236,231,223,.1)' }}>
                          <span className="w-6 text-center text-[1rem]" style={{ fontFamily: 'var(--font-bebas)', color: i === 0 && r.voteCount > 0 ? '#b8935a' : '#7d7871' }}>{i + 1}</span>
                          <span className="flex-1 text-[0.82rem] text-[#ece7df] truncate" style={{ fontFamily: 'var(--font-dm)' }}>{r.displayName}</span>
                          <div className="w-16 h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(236,231,223,.08)' }}>
                            <div className="h-full bg-[#cf3a2e]" style={{ width: `${(r.voteCount / maxVotes) * 100}%` }} />
                          </div>
                          <span className="text-[0.8rem] text-[#b9b4ac] w-9 text-right">{r.voteCount}票</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {!isCastVoteGame(game) && players.length > 0 && (() => {
                  const results = computePollingResults(game.questions, answers, players);
                  if (results.length === 0) return null;
                  const topMajority = results[0];
                  const topMinority = [...results].sort((a, b) => b.minorityCount - a.minorityCount)[0];
                  return (
                    <div className="flex flex-col gap-2 mt-4">
                      <p className="kg-label">みんなの実態まとめ</p>
                      {results.map((r, i) => (
                        <div key={r.playerId} className="flex items-center gap-3 bg-[#111114] px-3 py-2.5" style={{ border: '1px solid rgba(236,231,223,.1)' }}>
                          <span className="w-6 text-center text-[1rem]" style={{ fontFamily: 'var(--font-bebas)', color: '#7d7871' }}>{i + 1}</span>
                          <span className="flex-1 text-[0.82rem] text-[#ece7df] truncate" style={{ fontFamily: 'var(--font-dm)' }}>{r.displayName}</span>
                          {r.playerId === topMajority.playerId && <span className="text-[0.62rem] text-[#b8935a] border border-[rgba(184,147,90,.45)] px-2 py-0.5" style={{ letterSpacing: '0.06em' }}>多数派王</span>}
                          {r.playerId === topMinority.playerId && r.playerId !== topMajority.playerId && <span className="text-[0.62rem] text-[#cf3a2e] border border-[rgba(207,58,46,.45)] px-2 py-0.5" style={{ letterSpacing: '0.06em' }}>少数派</span>}
                          <span className="text-[0.7rem] text-[#7d7871]">{r.majorityCount}勝 / {r.minorityCount}負</span>
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
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h3 className="text-[#ece7df] text-[2.4rem]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.06em' }}>
                      {t('opinionReveal')}
                    </h3>
                    <p className="text-[#7d7871] text-[0.72rem]" style={{ letterSpacing: '0.14em' }}>
                      {game.loseRule === 'majority' ? t('opinionMajorityRule') : t('opinionMinorityRule')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {opinionResults.map((r) => {
                      const isLoser = r.lossCount === maxLoss && maxLoss > 0;
                      const isWinner = r.lossCount === minLoss && opinionResults.length > 1;
                      return (
                        <div key={r.playerId}
                          className="flex flex-col items-center gap-2 p-4 bg-[#111114] text-center"
                          style={{ border: isLoser ? '1px solid rgba(207,58,46,.6)' : isWinner ? '1px solid rgba(184,147,90,.6)' : '1px solid rgba(236,231,223,.1)' }}
                        >
                          <span aria-hidden className="h-4 w-px" style={{ backgroundColor: isLoser ? '#cf3a2e' : isWinner ? '#b8935a' : 'rgba(236,231,223,.2)' }} />
                          <span className="text-sm text-[#ece7df] leading-tight" style={{ fontFamily: 'var(--font-dm)' }}>
                            {r.displayName}
                          </span>
                          <span className="text-[0.7rem] text-[#7d7871]">
                            {t('opinionLoseCount', { count: r.lossCount })}
                          </span>
                          {isLoser && (
                            <span className="text-[0.62rem] text-[#cf3a2e] border border-[rgba(207,58,46,.45)] px-2 py-0.5 mt-1" style={{ letterSpacing: '0.06em' }}>
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
              className="flex items-center gap-3 bg-[#111114] border border-[rgba(236,231,223,.1)] px-5 py-4 transition-colors duration-300 hover:border-[rgba(184,147,90,.4)]"
            >
              <span aria-hidden className="text-[#b8935a] text-xs" style={{ fontFamily: 'var(--font-bebas)' }}>◆</span>
              <div className="flex-1 min-w-0">
                <p className="text-[0.84rem] text-[#ece7df]" style={{ fontFamily: 'var(--font-dm)', letterSpacing: '0.02em' }}>
                  キャバクラ探しなら <span className="text-[#cf3a2e]">センキャバ</span>
                </p>
                <p className="mt-0.5 text-[0.7rem] text-[#7d7871]">お店を探す・予約する</p>
              </div>
              <span className="shrink-0 text-[0.62rem] text-[#b8935a] border border-[rgba(184,147,90,.45)] px-2.5 py-1" style={{ letterSpacing: '0.1em' }}>DL</span>
            </a>

            <button
              type="button"
              onClick={handleNextGame}
              className="kg-btn kg-btn--primary"
            >
              <span>もう一度</span>
              <span aria-hidden>→</span>
            </button>
            <Link
              href="/presets"
              className="kg-btn kg-btn--ghost"
              style={{ minHeight: '48px', fontSize: '0.86rem' }}
            >
              {t('backToPresets')}
            </Link>
          </>
        )}

        {/* Draft fallback */}
        {game.status === 'draft' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-[#7d7871]" style={{ letterSpacing: '0.04em' }}>{t('openingLobby')}</p>
            <PinkBtn onClick={handleAdvance}>{t('openLobby')}</PinkBtn>
          </div>
        )}
      </div>
    </main>
  );
}
