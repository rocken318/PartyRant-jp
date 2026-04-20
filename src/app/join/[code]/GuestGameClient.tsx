'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Game, Answer } from '@/types/domain';
import type { GameEvent } from '@/lib/events/types';
import { useGameStream } from '@/lib/hooks/useGameStream';
import { useLocalPlayer } from '@/lib/hooks/useLocalPlayer';
import { AnswerButton } from '@/components/AnswerButton';
import { CountdownTimer } from '@/components/CountdownTimer';

type GuestState =
  | 'loading'
  | 'name_input'
  | 'lobby'
  | 'question'
  | 'answered'
  | 'reveal'
  | 'ended'
  | 'sp_question'
  | 'sp_answered'
  | 'sp_ended';

interface RevealInfo {
  myChoiceIndex: number;
  correctIndex: number | undefined;
  pointsEarned: number;
  totalPoints: number;
  allAnswers: Answer[];
}

interface Props {
  code: string;
}

export default function GuestGameClient({ code }: Props) {
  const t = useTranslations('guest');
  const router = useRouter();
  const [guestState, setGuestState] = useState<GuestState>('loading');
  const [game, setGame] = useState<Game | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [timePercent, setTimePercent] = useState(100);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [revealInfo, setRevealInfo] = useState<RevealInfo | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [localQuestionIndex, setLocalQuestionIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState<import('@/types/domain').Score[]>([]);
  const [endAnswers, setEndAnswers] = useState<Answer[]>([]);
  const [endPlayers, setEndPlayers] = useState<import('@/types/domain').Player[]>([]);
  const [endResultsStatus, setEndResultsStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  const [timedOut, setTimedOut] = useState(false);
  const { savePlayer, clearPlayer } = useLocalPlayer(gameId ?? '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Incremented on each new question to invalidate in-flight answer submissions
  const answerTokenRef = useRef(0);
  // Tracks which question index we are currently displaying, used to
  // guard against stale question_ended events arriving after question_started
  const expectedQuestionIndexRef = useRef(-1);
  // Mirrors selectedChoice synchronously so the reveal useEffect can check
  // whether the player already answered before revealInfo is populated
  const selectedChoiceRef = useRef<number | null>(null);
  // Incremented on each reveal fetch to cancel stale results from previous questions
  const revealTokenRef = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/code/${code}`);
        if (!res.ok) {
          setLoadError(t('gameNotFound'));
          return;
        }
        const data = (await res.json()) as Game;
        setGame(data);
        setGameId(data.id);

        const saved = (() => {
          const key = `partyrant_player_${data.id}`;
          const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
          if (!raw) return null;
          try { return JSON.parse(raw) as { playerId: string; displayName: string }; } catch { return null; }
        })();

        if (saved) {
          setPlayerId(saved.playerId);
          setDisplayName(saved.displayName);
          if (data.status === 'lobby') setGuestState('lobby');
          else if (data.status === 'question') {
            expectedQuestionIndexRef.current = data.currentQuestionIndex;
            setGuestState('question');
          } else if (data.status === 'reveal') setGuestState('reveal');
          else if (data.status === 'ended') {
            setGuestState('ended');
            fetchEndResults(data.id);
          }
          else setGuestState('lobby');
        } else {
          setGuestState('name_input');
        }
      } catch {
        setLoadError(t('failedToLoad'));
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (guestState !== 'question' || !game) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return;
    const startedAt = game.currentQuestionStartedAt ?? Date.now();
    const limitMs = (q.timeLimitSec + (game.mode === 'trivia' ? 10 : 0)) * 1000;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.max(0, Math.min(100, (1 - elapsed / limitMs) * 100));
      setTimePercent(pct);
      if (pct <= 0 && timerRef.current) clearInterval(timerRef.current);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [guestState, game]);

  // Fetch answers when entering reveal without having answered.
  // Skip if handleAnswer is still in flight (selectedChoiceRef !== null);
  // it will set revealInfo itself when done.
  // Derives myChoiceIndex from allAnswers by matching playerId + questionId so that
  // refresh/reconnect during reveal or a "change answer then timeout" scenario
  // still shows the server-recorded answer correctly.
  useEffect(() => {
    if (guestState !== 'reveal' || !game || !gameId || revealInfo !== null) return;
    if (selectedChoiceRef.current !== null) return;
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return;
    // Capture locals before async work so stale results from a previous question
    // can be detected and discarded.
    revealTokenRef.current++;
    const token = revealTokenRef.current;
    const qId = q.id;
    const correctIndex = q.correctIndex;
    const currentPlayerId = playerId;
    const currentTotal = totalPoints;
    fetch(`/api/games/${gameId}/answers`)
      .then(r => r.ok ? r.json() : [])
      .then((allAnswers: Answer[]) => {
        if (revealTokenRef.current !== token) return; // stale — next question already started
        const myAnswer = currentPlayerId
          ? allAnswers.find(a => a.playerId === currentPlayerId && a.questionId === qId)
          : undefined;
        setRevealInfo({
          myChoiceIndex: myAnswer?.choiceIndex ?? -1,
          correctIndex,
          pointsEarned: 0,
          totalPoints: currentTotal,
          allAnswers,
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestState]);

  const handleEvent = useCallback(
    (event: GameEvent) => {
      switch (event.type) {
        case 'game_started':
          answerTokenRef.current++;
          expectedQuestionIndexRef.current = event.game.currentQuestionIndex;
          selectedChoiceRef.current = null;
          setGame(event.game);
          setGuestState('question');
          setSelectedChoice(null);
          setTimedOut(false);
          setTimePercent(100);
          break;
        case 'question_started':
          answerTokenRef.current++;
          expectedQuestionIndexRef.current = event.questionIndex;
          selectedChoiceRef.current = null;
          setGame((prev) =>
            prev
              ? { ...prev, currentQuestionIndex: event.questionIndex, currentQuestionStartedAt: event.startedAt, status: 'question' }
              : prev
          );
          setGuestState('question');
          setSelectedChoice(null);
          setTimedOut(false);
          setRevealInfo(null);
          setTimePercent(100);
          break;
        case 'question_ended':
          // Guard against stale question_ended events arriving after question_started
          // for the next question (race condition when host advances quickly)
          if (expectedQuestionIndexRef.current === event.questionIndex) {
            setGuestState('reveal');
          }
          break;
        case 'game_ended':
          setGame(event.game);
          setGuestState('ended');
          fetchEndResults(event.game.id);
          break;
        default:
          break;
      }
    },
    [gameId]
  );

  async function fetchEndResults(id: string) {
    setEndResultsStatus('loading');
    try {
      const [scoresRes, answersRes, playersRes] = await Promise.all([
        fetch(`/api/games/${id}/scores`),
        fetch(`/api/games/${id}/answers`),
        fetch(`/api/games/${id}/players`),
      ]);
      setLeaderboard(scoresRes.ok ? await scoresRes.json() as import('@/types/domain').Score[] : []);
      setEndAnswers(answersRes.ok ? await answersRes.json() as Answer[] : []);
      setEndPlayers(playersRes.ok ? await playersRes.json() as import('@/types/domain').Player[] : []);
      setEndResultsStatus('loaded');
    } catch {
      setEndResultsStatus('error');
    }
  }

  useGameStream(gameId, handleEvent);

  async function handleJoinGame() {
    const name = nameInput.trim();
    if (!name) { setNameError(t('errorNameEmpty')); return; }
    if (name.length > 20) { setNameError(t('errorNameLength')); return; }
    setNameError('');
    try {
      const res = await fetch(`/api/games/${gameId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name }),
      });
      if (!res.ok) { setNameError(t('errorJoinFailed')); return; }
      const player = (await res.json()) as { id: string; displayName: string };
      savePlayer(player.id, player.displayName);
      setPlayerId(player.id);
      setDisplayName(player.displayName);
      if (game?.gameMode === 'self_paced') {
        setLocalQuestionIndex(0);
        setGuestState('sp_question');
      } else {
        setGuestState('lobby');
      }
    } catch {
      setNameError(t('errorNetwork'));
    }
  }

  async function handleSelfPacedAnswer(choiceIndex: number) {
    if (!game || !gameId || !playerId) return;
    const q = game.questions[localQuestionIndex];
    if (!q) return;
    selectedChoiceRef.current = choiceIndex;
    setSelectedChoice(choiceIndex);
    setGuestState('sp_answered');
    try {
      await fetch(`/api/games/${gameId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, questionId: q.id, choiceIndex, responseTimeMs: 0 }),
      });
      let pointsEarned = 0;
      if (game.mode === 'trivia' && q.correctIndex !== undefined && choiceIndex === q.correctIndex) {
        pointsEarned = 500;
      }
      setTotalPoints(prev => prev + pointsEarned);
      setRevealInfo({
        myChoiceIndex: choiceIndex,
        correctIndex: q.correctIndex,
        pointsEarned,
        totalPoints: totalPoints + pointsEarned,
        allAnswers: [],
      });
    } catch { /* keep state */ }
  }

  function handleSelfPacedNext() {
    if (!game) return;
    const nextIndex = localQuestionIndex + 1;
    if (nextIndex < game.questions.length) {
      setLocalQuestionIndex(nextIndex);
      selectedChoiceRef.current = null;
      setSelectedChoice(null);
      setRevealInfo(null);
      setGuestState('sp_question');
    } else {
      setGuestState('sp_ended');
    }
  }

  async function handleAnswer(choiceIndex: number) {
    if (!game || !gameId || !playerId || selectedChoice !== null) return;
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return;
    // Capture locals before any async work so closures stay correct
    const token = answerTokenRef.current;
    const questionId = q.id;
    const correctIndex = q.correctIndex;
    const timeLimitSec = q.timeLimitSec + (game.mode === 'trivia' ? 10 : 0);
    const gameMode = game.mode;
    selectedChoiceRef.current = choiceIndex;
    setSelectedChoice(choiceIndex);
    setGuestState('answered');
    const startedAt = game.currentQuestionStartedAt ?? Date.now();
    const responseTimeMs = Date.now() - startedAt;
    try {
      await fetch(`/api/games/${gameId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, questionId, choiceIndex, responseTimeMs }),
      });
      // Abort if a new question started while we were awaiting
      if (answerTokenRef.current !== token) return;
      let pointsEarned = 0;
      if (gameMode === 'trivia' && correctIndex !== undefined && choiceIndex === correctIndex) {
        pointsEarned = 500 + Math.max(0, Math.floor(500 * (1 - responseTimeMs / (timeLimitSec * 1000))));
      }
      const newTotal = totalPoints + pointsEarned;
      setTotalPoints(newTotal);
      const allRes = await fetch(`/api/games/${gameId}/answers`);
      const allAnswers: Answer[] = allRes.ok ? ((await allRes.json()) as Answer[]) : [];
      if (answerTokenRef.current !== token) return;
      setRevealInfo({ myChoiceIndex: choiceIndex, correctIndex, pointsEarned, totalPoints: newTotal, allAnswers });
    } catch {
      // POST or follow-up GET failed. Still set revealInfo with local data so the
      // reveal screen never hangs on the loading spinner indefinitely.
      if (answerTokenRef.current !== token) return;
      setRevealInfo({
        myChoiceIndex: choiceIndex,
        correctIndex,
        pointsEarned: 0,
        totalPoints,
        allAnswers: [],
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center gap-6 px-6">
          <p className="text-red-500 text-lg font-bold text-center">{loadError}</p>
          <button
            type="button"
            onClick={() => router.push('/join')}
            className="px-8 py-3 bg-pr-pink text-white font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('back')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'loading') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-bold">{t('loading')}</p>
        </div>
      </main>
    );
  }

  if (guestState === 'name_input') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6">
          <h1
            className="text-pr-dark text-5xl text-center"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('whatsYourName')}
          </h1>
          <input
            type="text"
            maxLength={20}
            placeholder={t('namePlaceholder')}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
            autoFocus
            className="w-full text-xl text-center bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[4px_4px_0_#111] px-4 py-3 focus:outline-none focus:shadow-[6px_6px_0_#111] transition-shadow duration-75 text-pr-dark placeholder-gray-300"
            style={{ fontFamily: 'var(--font-dm)' }}
          />
          {nameError && (
            <p className="text-red-500 text-sm font-bold text-center">{nameError}</p>
          )}
          <button
            type="button"
            onClick={handleJoinGame}
            className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('joinButton')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'lobby') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6 text-center">
          <div className="w-24 h-24 bg-pr-pink rounded-full border-[4px] border-pr-dark shadow-[5px_5px_0_#111] flex items-center justify-center text-4xl animate-bounce">
            🎮
          </div>
          <div>
            <p className="text-pr-dark text-xl font-bold" style={{ fontFamily: 'var(--font-dm)' }}>
              {t('youJoinedAs')}
            </p>
            <p
              className="text-pr-pink text-4xl"
              style={{ fontFamily: 'var(--font-bebas)', lineHeight: 1.1 }}
            >
              {displayName}
            </p>
          </div>
          <p className="text-gray-400 font-bold animate-pulse">
            {t('waitingForHost')}
          </p>
          <button
            type="button"
            onClick={() => { clearPlayer(); setPlayerId(null); setDisplayName(''); setNameInput(''); setGuestState('name_input'); }}
            className="text-gray-400 text-sm underline touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('changeName')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'question' && game) {
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return null;
    const startedAt = game.currentQuestionStartedAt ?? Date.now();

    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="bg-pr-dark px-4 pt-4 pb-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-bold uppercase tracking-widest">
              Q {game.currentQuestionIndex + 1}/{game.questions.length}
            </span>
          </div>
          <CountdownTimer
            startedAt={startedAt}
            timeLimitSec={q.timeLimitSec + (game.mode === 'trivia' ? 10 : 0)}
            onExpired={() => {
              if (selectedChoice !== null) setGuestState('answered');
              else setTimedOut(true);
            }}
          />
        </div>

        <div className="flex flex-col flex-1 px-4 py-5 gap-5">
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={q.imageUrl}
              alt="Question"
              className="w-full rounded-[8px] object-cover max-h-48 border-[3px] border-pr-dark shadow-[4px_4px_0_#111]"
            />
          )}
          <p
            className="text-pr-dark text-center font-bold"
            style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', lineHeight: 1.2 }}
          >
            {q.text}
          </p>

          <div className="grid grid-cols-2 gap-3 mt-auto">
            {q.options.map((option, i) => (
              <AnswerButton
                key={i}
                label={option}
                index={i}
                disabled={selectedChoice !== null || timedOut}
                selected={selectedChoice === i}
                onClick={() => handleAnswer(i)}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (guestState === 'answered') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6 text-center">
          <div className="w-24 h-24 bg-pr-yellow rounded-full border-[4px] border-pr-dark shadow-[5px_5px_0_#111] flex items-center justify-center text-4xl font-bold text-pr-dark">
            ✓
          </div>
          <p
            className="text-pr-dark text-4xl"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('answerSubmitted')}
          </p>
          <p className="text-gray-400 font-bold animate-pulse">
            {t('waitingForResults')}
          </p>
          <button
            type="button"
            onClick={() => { selectedChoiceRef.current = null; setSelectedChoice(null); setRevealInfo(null); setGuestState('question'); }}
            className="text-gray-400 text-sm underline touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}
          >
            {t('changeAnswer')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'reveal' && game) {
    const q = game.questions[game.currentQuestionIndex];
    if (!q) return null;

    if (game.mode === 'trivia') {
      if (revealInfo === null) {
        return (
          <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
            <div className="flex flex-col flex-1 items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
            </div>
          </main>
        );
      }
      const didAnswer = revealInfo.myChoiceIndex !== -1;
      const isCorrect =
        didAnswer &&
        revealInfo.correctIndex !== undefined &&
        revealInfo.myChoiceIndex === revealInfo.correctIndex;
      const correctOption = q.correctIndex !== undefined ? q.options[q.correctIndex] : '—';

      return (
        <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
          <div className="flex flex-col flex-1 items-center justify-center px-6 gap-5 text-center">
            <div
              className="w-24 h-24 rounded-full border-[4px] border-pr-dark shadow-[5px_5px_0_#111] flex items-center justify-center text-4xl"
              style={{ backgroundColor: didAnswer ? (isCorrect ? '#00C472' : '#FF3B30') : '#888' }}
            >
              {didAnswer ? (isCorrect ? '🎉' : '😅') : '？'}
            </div>

            {didAnswer && (
              <p
                className="font-extrabold"
                style={{ fontFamily: 'var(--font-bebas)', fontSize: '2.8rem', lineHeight: 1, color: isCorrect ? '#00C472' : '#FF3B30' }}
              >
                {isCorrect ? t('correct') : t('wrong')}
              </p>
            )}

            <div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-1">{t('correctAnswer')}</p>
              <p
                className="text-pr-dark text-3xl"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                {correctOption}
              </p>
            </div>

            <div className="w-full bg-white border-[3px] border-pr-dark shadow-[5px_5px_0_#111] rounded-[8px] px-6 py-5 flex flex-col gap-2">
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{t('pointsThisRound')}</p>
              {didAnswer ? (
                <>
                  <p
                    className="text-pr-pink"
                    style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.5rem', lineHeight: 1 }}
                  >
                    +{revealInfo.pointsEarned}
                  </p>
                  <p className="text-gray-400 text-sm font-bold">{t('totalPoints', { total: revealInfo.totalPoints })}</p>
                </>
              ) : (
                <p
                  className="text-gray-400"
                  style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', lineHeight: 1 }}
                >
                  {t('noAnswer')}
                </p>
              )}
            </div>

            <p className="text-gray-400 font-bold animate-pulse text-sm">
              {t('waitingForNext')}
            </p>
          </div>
        </main>
      );
    }

    // Polling reveal
    if (revealInfo === null) {
      return (
        <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
          <div className="flex flex-col flex-1 items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      );
    }
    const totalVotes = revealInfo.allAnswers.filter((a) => a.questionId === q.id).length;
    const BG = ['#FF0080', '#FFD600', '#00C472', '#3B82F6'];
    const FG = ['#fff', '#111', '#fff', '#fff'];

    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 px-4 py-8 gap-5">
          <h2
            className="text-pr-dark text-4xl text-center"
            style={{ fontFamily: 'var(--font-bebas)' }}
          >
            {t('results')}
          </h2>
          <div className="flex flex-col gap-3">
            {q.options.map((option, i) => {
              const votes = revealInfo.allAnswers.filter((a) => a.questionId === q.id && a.choiceIndex === i).length;
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isMyVote = revealInfo.myChoiceIndex !== -1 && revealInfo.myChoiceIndex === i;
              return (
                <div
                  key={i}
                  className="rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111] px-4 py-3"
                  style={{ backgroundColor: BG[i % 4] }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm" style={{ color: FG[i % 4] }}>
                      {isMyVote && '✓ '}{option}
                    </span>
                    <span className="text-sm font-bold" style={{ color: FG[i % 4], opacity: 0.8 }}>
                      {votes} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.5)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-gray-400 font-bold animate-pulse text-sm text-center mt-4">
            {t('waitingForNext')}
          </p>
        </div>
      </main>
    );
  }

  if (guestState === 'ended' && game) {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="bg-pr-dark px-4 py-3">
          <h1 className="text-pr-pink text-4xl" style={{ fontFamily: 'var(--font-bebas)' }}>
            {t('gameOver')}
          </h1>
        </div>
        <div className="flex-1 px-4 py-6 flex flex-col gap-5">
          {game.mode === 'trivia' && (
            <div className="w-full bg-white border-[3px] border-pr-dark shadow-[4px_4px_0_#111] rounded-[8px] px-5 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('yourScore')}</p>
              <p className="text-pr-pink" style={{ fontFamily: 'var(--font-bebas)', fontSize: '3.5rem', lineHeight: 1 }}>{totalPoints}</p>
            </div>
          )}

          {game.mode === 'trivia' && leaderboard.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-pr-dark text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>{t('leaderboard')}</h2>
              {leaderboard.map((score, i) => {
                const isMe = score.playerId === playerId;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return (
                  <div key={score.playerId}
                    className={`flex items-center justify-between px-4 py-3 rounded-[6px] border-[3px] border-pr-dark ${isMe ? 'bg-pr-pink text-white shadow-[4px_4px_0_#111]' : 'bg-white shadow-[3px_3px_0_#111]'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{medal}</span>
                      <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-dm)' }}>
                        {score.displayName}{isMe ? t('you') : ''}
                      </span>
                    </div>
                    <span className="font-bold text-sm">{score.totalPoints} {t('pts')}</span>
                  </div>
                );
              })}
            </div>
          )}

          {game.mode === 'polling' && endResultsStatus === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {game.mode === 'polling' && endResultsStatus === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-red-500 font-bold text-sm">{t('loadError')}</p>
              <button type="button" onClick={() => gameId && fetchEndResults(gameId)}
                className="px-4 py-2 bg-pr-pink text-white text-sm font-bold rounded-[6px] border-[2px] border-pr-dark shadow-[3px_3px_0_#111] touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)' }}>
                {t('retry')}
              </button>
            </div>
          )}

          {game.mode === 'polling' && endResultsStatus === 'loaded' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-pr-dark text-2xl" style={{ fontFamily: 'var(--font-bebas)' }}>{t('results')}</h2>
              {game.questions.map((q, qi) => {
                const qAnswers = endAnswers.filter(a => a.questionId === q.id);
                const totalVotes = qAnswers.length;
                const BG = ['#FF0080', '#FFD600', '#00C472', '#3B82F6'];
                const FG = ['#fff', '#111', '#fff', '#fff'];
                return (
                  <div key={q.id} className="flex flex-col gap-2 p-3 bg-white rounded-[8px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111]">
                    <p className="font-bold text-sm text-pr-dark" style={{ fontFamily: 'var(--font-dm)' }}>{qi + 1}. {q.text}</p>
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((option, j) => {
                        const votes = qAnswers.filter(a => a.choiceIndex === j).length;
                        const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        return (
                          <div key={j} className="rounded-[4px] border-[2px] border-pr-dark px-3 py-2" style={{ backgroundColor: BG[j % 4] }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-xs" style={{ color: FG[j % 4] }}>{option}</span>
                              <span className="text-xs font-bold" style={{ color: FG[j % 4], opacity: 0.8 }}>{votes} ({pct}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {game.mode === 'opinion' && endResultsStatus === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-pr-pink border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {game.mode === 'opinion' && endResultsStatus === 'error' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-red-500 font-bold text-sm">{t('loadError')}</p>
              <button type="button" onClick={() => gameId && fetchEndResults(gameId)}
                className="px-4 py-2 bg-pr-pink text-white text-sm font-bold rounded-[6px] border-[2px] border-pr-dark shadow-[3px_3px_0_#111] touch-manipulation"
                style={{ fontFamily: 'var(--font-dm)' }}>
                {t('retry')}
              </button>
            </div>
          )}

          {game.mode === 'opinion' && endResultsStatus === 'loaded' && (() => {
            const loseRule = game.loseRule ?? 'minority';
            interface OpinionResult { playerId: string; displayName: string; lossCount: number; }
            const results: OpinionResult[] = endPlayers.map(p => ({ playerId: p.id, displayName: p.displayName, lossCount: 0 }));
            for (const q of game.questions) {
              const qAnswers = endAnswers.filter(a => a.questionId === q.id);
              const counts = q.options.map((_, i) => qAnswers.filter(a => a.choiceIndex === i).length);
              const nonZero = counts.filter(c => c > 0);
              if (nonZero.length <= 1) continue;
              const threshold = loseRule === 'minority' ? Math.min(...nonZero) : Math.max(...nonZero);
              const losingIndices = counts.map((c, i) => (c === threshold ? i : -1)).filter(i => i >= 0);
              for (const ans of qAnswers) {
                if (losingIndices.includes(ans.choiceIndex)) {
                  const r = results.find(r => r.playerId === ans.playerId);
                  if (r) r.lossCount++;
                }
              }
            }
            results.sort((a, b) => b.lossCount - a.lossCount);
            if (results.length === 0) return null;
            const maxLoss = results[0].lossCount;
            const minLoss = results[results.length - 1].lossCount;
            return (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col items-center gap-1 py-3">
                  <h2 className="text-pr-dark text-3xl text-center" style={{ fontFamily: 'var(--font-bebas)' }}>{t('opinionReveal')}</h2>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    {loseRule === 'majority' ? t('opinionMajorityRule') : t('opinionMinorityRule')}
                  </p>
                </div>
                {results.map(r => {
                  const isMe = r.playerId === playerId;
                  const isLoser = r.lossCount === maxLoss && maxLoss > 0 && results.length > 1;
                  const isWinner = !isLoser && maxLoss !== minLoss && r.lossCount === minLoss && results.length > 1;
                  return (
                    <div key={r.playerId}
                      className="flex items-center justify-between px-4 py-3 rounded-[6px] border-[3px] border-pr-dark shadow-[3px_3px_0_#111]"
                      style={{ backgroundColor: isLoser ? '#FEE2E2' : isWinner ? '#FEF9C3' : '#fff' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{isLoser ? '💀' : isWinner ? '👑' : '😐'}</span>
                        <span className="font-bold text-sm text-pr-dark" style={{ fontFamily: 'var(--font-dm)' }}>
                          {r.displayName}{isMe ? t('you') : ''}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs font-bold text-gray-500">{t('opinionLossCount', { count: r.lossCount })}</span>
                        {isLoser && <span className="text-xs font-bold text-red-500">{t('opinionLoser')}</span>}
                        {isWinner && <span className="text-xs font-bold text-yellow-600">{t('opinionWinner')}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <button type="button" onClick={() => router.push('/join')}
            className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation mt-auto"
            style={{ fontFamily: 'var(--font-dm)' }}>
            {t('playAgain')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'sp_question' && game) {
    const q = game.questions[localQuestionIndex];
    if (!q) return null;
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="bg-pr-dark px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-white text-sm font-bold uppercase tracking-widest">
            Q {localQuestionIndex + 1}/{game.questions.length}
          </span>
          <span className="text-gray-400 text-xs font-bold">{t('selfPaced')}</span>
        </div>
        <div className="flex flex-col flex-1 px-4 py-5 gap-5">
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt="Question" className="w-full rounded-[8px] object-cover max-h-48 border-[3px] border-pr-dark shadow-[4px_4px_0_#111]" />
          )}
          <p className="text-pr-dark text-center font-bold" style={{ fontFamily: 'var(--font-bebas)', fontSize: '2rem', lineHeight: 1.2 }}>
            {q.text}
          </p>
          <div className="grid grid-cols-2 gap-3 mt-auto">
            {q.options.map((option, i) => (
              <AnswerButton key={i} label={option} index={i} disabled={false} selected={false} onClick={() => handleSelfPacedAnswer(i)} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (guestState === 'sp_answered' && game) {
    const q = game.questions[localQuestionIndex];
    if (!q) return null;
    const isCorrect = game.mode === 'trivia' && revealInfo?.correctIndex !== undefined && revealInfo.myChoiceIndex === revealInfo.correctIndex;
    const correctOption = q.correctIndex !== undefined ? q.options[q.correctIndex] : null;
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-5 text-center">
          {game.mode === 'trivia' && (
            <>
              <div className="w-20 h-20 rounded-full border-[4px] border-pr-dark shadow-[4px_4px_0_#111] flex items-center justify-center text-3xl"
                style={{ backgroundColor: isCorrect ? '#00C472' : '#FF3B30' }}>
                {isCorrect ? '🎉' : '😅'}
              </div>
              {correctOption && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('correctAnswer')}</p>
                  <p className="text-3xl text-pr-dark" style={{ fontFamily: 'var(--font-bebas)' }}>{correctOption}</p>
                </div>
              )}
              {revealInfo && (
                <div className="w-full bg-white border-[3px] border-pr-dark shadow-[4px_4px_0_#111] rounded-[8px] px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{t('pointsThisRound')}</p>
                  <p className="text-pr-pink" style={{ fontFamily: 'var(--font-bebas)', fontSize: '3rem', lineHeight: 1 }}>+{revealInfo.pointsEarned}</p>
                  <p className="text-xs text-gray-400">{t('totalPoints', { total: revealInfo.totalPoints })}</p>
                </div>
              )}
            </>
          )}
          {game.mode === 'polling' && (
            <p className="font-bold text-pr-dark text-xl" style={{ fontFamily: 'var(--font-bebas)' }}>{t('voteRecorded')}</p>
          )}
          <button type="button" onClick={handleSelfPacedNext}
            className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}>
            {localQuestionIndex < game.questions.length - 1 ? t('nextQuestion') : t('seeResults')}
          </button>
        </div>
      </main>
    );
  }

  if (guestState === 'sp_ended') {
    return (
      <main className="flex flex-col min-h-screen bg-white max-w-[480px] mx-auto">
        <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6 text-center">
          <span className="text-7xl">🏆</span>
          <h1 className="text-pr-dark text-6xl" style={{ fontFamily: 'var(--font-bebas)' }}>{t('done')}</h1>
          <div className="w-full bg-white border-[3px] border-pr-dark shadow-[5px_5px_0_#111] rounded-[8px] px-6 py-5">
            <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">{t('yourScore')}</p>
            <p className="text-pr-pink" style={{ fontFamily: 'var(--font-bebas)', fontSize: '4rem', lineHeight: 1 }}>{totalPoints}</p>
            <p className="text-gray-400 text-sm">{t('points')}</p>
          </div>
          <button type="button" onClick={() => router.push('/join')}
            className="w-full h-16 bg-pr-pink text-white text-xl font-bold rounded-[6px] border-[3px] border-pr-dark shadow-[5px_5px_0_#111] active:shadow-[2px_2px_0_#111] active:translate-x-[2px] active:translate-y-[2px] transition-[transform,box-shadow] duration-75 touch-manipulation"
            style={{ fontFamily: 'var(--font-dm)' }}>
            {t('playAgain')}
          </button>
        </div>
      </main>
    );
  }

  return null;
}
