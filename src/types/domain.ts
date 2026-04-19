export type GameType = 'trivia' | 'polling';   // what kind of game
export type PlayMode = 'live' | 'self_paced';  // how it's played

/** @deprecated use GameType */
export type GameMode = GameType;

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
