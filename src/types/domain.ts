export type GameType = 'trivia' | 'polling' | 'opinion';   // what kind of game
export type LoseRule = 'minority' | 'majority';  // opinion mode: who loses
export type PlayMode = 'live' | 'self_paced';  // how it's played

/** @deprecated use GameType */
export type GameMode = GameType;

/**
 * 設問が「何を選ばせるか」を表す型。
 * - fixed:   固定の選択肢（内容そのもの）。差し替えしない。trivia かつ correctIndex!=null のときのみ採点。
 * - players: 参加者本人。実行時に参加者名で解決。常に非採点（名指し集計）。
 * - casts:   ゲームのキャスト。キャスト名で解決。常に非採点（名指し集計）。
 * undefined は 'fixed' として扱う（後方互換）。
 */
export type AnswerTarget = 'fixed' | 'players' | 'casts';

export type GameStatus =
  | 'draft'
  | 'lobby'
  | 'question'
  | 'reveal'
  | 'ended';

export interface Question {
  id: string;
  order: number;
  text: string;
  imageUrl?: string;       // Supabase Storage public URL (was imageDataUrl)
  options: string[];
  correctIndex?: number;
  timeLimitSec: number;
  /** 選択対象の種別。undefined = 'fixed'（後方互換）。 */
  answerTarget?: AnswerTarget;
}

export interface Event {
  id: string;
  hostId: string;
  name: string;
  createdAt: number;
}

export interface Game {
  id: string;
  eventId?: string;
  hostId?: string;
  joinCode: string;
  mode: GameType;
  gameMode: PlayMode;
  title: string;
  description?: string;
  scene?: string;
  isPreset?: boolean;
  loseRule?: LoseRule;
  questions: Question[];
  status: GameStatus;
  currentQuestionIndex: number;
  currentQuestionStartedAt?: number;
  createdAt: number;
  endedAt?: number;
}

export interface Player {
  id: string;
  gameId: string;
  displayName: string;
  joinedAt: number;
}

export interface Answer {
  id: string;
  gameId: string;
  playerId: string;
  questionId: string;
  choiceIndex: number;
  answeredAt: number;
  responseTimeMs: number;
}

export interface Score {
  playerId: string;
  displayName: string;
  totalPoints: number;
  correctCount: number;
}
