import type { Game, Player, Answer } from '@/types/domain';

export type GameEvent =
  | { type: 'connected'; gameId: string }
  | { type: 'player_joined'; player: Player }
  | { type: 'game_started'; game: Game }
  | { type: 'question_started'; questionIndex: number; startedAt: number; game?: Game }
  | { type: 'answer_submitted'; answer: Answer }
  | { type: 'question_ended'; questionIndex: number }
  | { type: 'game_ended'; game: Game };
