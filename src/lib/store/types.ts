import type { Game, GameType, GameStatus, PlayMode, LoseRule, Player, Answer, Question, Event } from '@/types/domain';

export interface CreateEventInput {
  hostId: string;
  name: string;
}

export interface CreateGameInput {
  eventId?: string;
  hostId?: string;
  mode: GameType;
  gameMode: PlayMode;
  title: string;
  description?: string;
  scene?: string;
  loseRule?: LoseRule;
  casts?: string[];
  questions: Omit<Question, 'id' | 'order'>[];
}

export interface SubmitAnswerInput {
  gameId: string;
  playerId: string;
  questionId: string;
  choiceIndex: number;
}

export interface GameStore {
  // Events
  createEvent(input: CreateEventInput): Promise<Event>;
  getEvent(eventId: string): Promise<Event | null>;
  listEvents(hostId: string): Promise<Event[]>;
  listGamesByEvent(eventId: string): Promise<Game[]>;

  // Games
  createGame(input: CreateGameInput): Promise<Game>;
  getGame(gameId: string): Promise<Game | null>;
  getGameByCode(code: string): Promise<Game | null>;
  updateGameStatus(gameId: string, status: GameStatus, extra?: Partial<Game>): Promise<Game>;
  advanceQuestion(gameId: string): Promise<Game>;
  listPresets(): Promise<Game[]>;
  /** ゲームの questions 配列を丸ごと置き換える（プレースホルダー置換・キャスト名反映用） */
  updateGameQuestions(gameId: string, questions: Question[]): Promise<Game>;
  /** ゲームのキャスト名リストを保存する（answerTarget==='casts' の実名解決用） */
  updateGameCasts(gameId: string, casts: string[]): Promise<Game>;
  /** answers/players を削除しゲームを lobby へ戻す */
  resetGame(gameId: string): Promise<Game>;
  /** ホストの最新 lobby ゲームを 1 件返す（exceptGameId は除外） */
  findLatestLobbyGame(hostId: string, exceptGameId?: string): Promise<{ id: string; joinCode: string } | null>;

  // Players
  addPlayer(gameId: string, displayName: string): Promise<Player>;
  listPlayers(gameId: string): Promise<Player[]>;

  // Answers
  submitAnswer(input: SubmitAnswerInput): Promise<Answer>;
  listAnswers(gameId: string, questionId?: string): Promise<Answer[]>;
}
