import type { Game, GameStatus, Player, Answer, Event } from '@/types/domain';
import type { GameStore, CreateEventInput, CreateGameInput, SubmitAnswerInput } from './types';
import { generateId, generateJoinCode } from '@/lib/utils';

export class MemoryStore implements GameStore {
  private games = new Map<string, Game>();
  private codeIndex = new Map<string, string>(); // joinCode -> gameId
  private players = new Map<string, Player[]>(); // gameId -> players
  private answers = new Map<string, Answer[]>(); // gameId -> answers
  private events = new Map<string, Event>();

  // ── Events ──────────────────────────────────────────────────────────────────

  async createEvent(input: CreateEventInput): Promise<Event> {
    const event: Event = { id: generateId(), hostId: input.hostId, name: input.name, createdAt: Date.now() };
    this.events.set(event.id, event);
    return event;
  }

  async getEvent(eventId: string): Promise<Event | null> {
    return this.events.get(eventId) ?? null;
  }

  async listEvents(hostId: string): Promise<Event[]> {
    return [...this.events.values()].filter(e => e.hostId === hostId);
  }

  async listGamesByEvent(eventId: string): Promise<Game[]> {
    return [...this.games.values()].filter(g => g.eventId === eventId);
  }

  // ── Games ────────────────────────────────────────────────────────────────────

  async createGame(input: CreateGameInput): Promise<Game> {
    const id = generateId();
    let joinCode = generateJoinCode();
    while (this.codeIndex.has(joinCode)) {
      joinCode = generateJoinCode();
    }

    const game: Game = {
      id,
      eventId: input.eventId,
      hostId: input.hostId,
      joinCode,
      mode: input.mode,
      gameMode: input.gameMode ?? 'live',
      title: input.title,
      questions: input.questions.map((q, i) => ({
        ...q,
        id: generateId(),
        order: i,
      })),
      status: 'lobby',
      currentQuestionIndex: 0,
      createdAt: Date.now(),
    };

    this.games.set(id, game);
    this.codeIndex.set(joinCode, id);
    this.players.set(id, []);
    this.answers.set(id, []);

    return game;
  }

  async getGame(gameId: string): Promise<Game | null> {
    return this.games.get(gameId) ?? null;
  }

  async getGameByCode(code: string): Promise<Game | null> {
    const gameId = this.codeIndex.get(code);
    if (!gameId) return null;
    return this.games.get(gameId) ?? null;
  }

  async updateGameStatus(gameId: string, status: GameStatus, extra?: Partial<Game>): Promise<Game> {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const updated: Game = { ...game, ...extra, status };
    this.games.set(gameId, updated);
    return updated;
  }

  async advanceQuestion(gameId: string): Promise<Game> {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    let updated: Game;

    if (game.status === 'lobby') {
      updated = {
        ...game,
        status: 'question',
        currentQuestionIndex: 0,
        currentQuestionStartedAt: Date.now(),
      };
    } else if (game.status === 'question') {
      updated = { ...game, status: 'reveal' };
    } else if (game.status === 'reveal') {
      const nextIndex = game.currentQuestionIndex + 1;
      if (nextIndex < game.questions.length) {
        updated = {
          ...game,
          status: 'question',
          currentQuestionIndex: nextIndex,
          currentQuestionStartedAt: Date.now(),
        };
      } else {
        updated = { ...game, status: 'ended', endedAt: Date.now() };
      }
    } else {
      throw new Error(`Cannot advance from status: ${game.status}`);
    }

    this.games.set(gameId, updated);
    return updated;
  }

  async addPlayer(gameId: string, displayName: string): Promise<Player> {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const player: Player = {
      id: generateId(),
      gameId,
      displayName,
      joinedAt: Date.now(),
    };

    const list = this.players.get(gameId) ?? [];
    list.push(player);
    this.players.set(gameId, list);

    return player;
  }

  async listPlayers(gameId: string): Promise<Player[]> {
    return this.players.get(gameId) ?? [];
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
    const game = this.games.get(input.gameId);
    if (!game) throw new Error(`Game not found: ${input.gameId}`);

    const responseTimeMs = Date.now() - (game.currentQuestionStartedAt ?? Date.now());

    const answer: Answer = {
      id: generateId(),
      gameId: input.gameId,
      playerId: input.playerId,
      questionId: input.questionId,
      choiceIndex: input.choiceIndex,
      answeredAt: Date.now(),
      responseTimeMs,
    };

    const list = this.answers.get(input.gameId) ?? [];
    list.push(answer);
    this.answers.set(input.gameId, list);

    return answer;
  }

  async listAnswers(gameId: string, questionId?: string): Promise<Answer[]> {
    const list = this.answers.get(gameId) ?? [];
    if (questionId) {
      return list.filter((a) => a.questionId === questionId);
    }
    return list;
  }

  async listPresets(): Promise<Game[]> {
    return Array.from(this.games.values()).filter((g) => g.isPreset);
  }
}
