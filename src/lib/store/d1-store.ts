import type { GameStore, CreateEventInput, CreateGameInput, SubmitAnswerInput } from './types';
import type { Game, GameStatus, Player, Answer, Event, Question } from '@/types/domain';
import { getDb } from '@/lib/cloudflare/context';
import { generateId, generateJoinCode } from '@/lib/utils';

type Row = Record<string, unknown>;

function toEvent(row: Row): Event {
  return {
    id: row.id as string,
    hostId: row.host_id as string,
    name: row.name as string,
    createdAt: row.created_at as number,
  };
}

function toGame(row: Row): Game {
  return {
    id: row.id as string,
    eventId: (row.event_id as string | null) ?? undefined,
    hostId: (row.host_id as string | null) ?? undefined,
    joinCode: row.join_code as string,
    mode: row.mode as Game['mode'],
    gameMode: (row.game_mode as Game['gameMode']) ?? 'live',
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    scene: (row.scene as string | null) ?? undefined,
    isPreset: row.is_preset === 1 || row.is_preset === true,
    loseRule: (row.lose_rule as Game['loseRule'] | null) ?? undefined,
    casts: parseCasts(row.casts),
    questions: parseQuestions(row.questions),
    status: row.status as GameStatus,
    currentQuestionIndex: row.current_question_index as number,
    currentQuestionStartedAt: (row.current_question_started_at as number | null) ?? undefined,
    createdAt: row.created_at as number,
    endedAt: (row.ended_at as number | null) ?? undefined,
  };
}

function parseQuestions(value: unknown): Question[] {
  if (typeof value === 'string') return JSON.parse(value) as Question[];
  if (Array.isArray(value)) return value as Question[];
  return [];
}

function parseCasts(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try { return JSON.parse(value) as string[]; } catch { return []; }
  }
  return [];
}

function toPlayer(row: Row): Player {
  return {
    id: row.id as string,
    gameId: row.game_id as string,
    displayName: row.display_name as string,
    joinedAt: row.joined_at as number,
  };
}

function toAnswer(row: Row): Answer {
  return {
    id: row.id as string,
    gameId: row.game_id as string,
    playerId: row.player_id as string,
    questionId: row.question_id as string,
    choiceIndex: row.choice_index as number,
    answeredAt: row.answered_at as number,
    responseTimeMs: row.response_time_ms as number,
  };
}

export class D1GameStore implements GameStore {
  private get db(): D1Database { return getDb(); }

  // ── Events ─────────────────────────────────────────────────────────────────

  async createEvent(input: CreateEventInput): Promise<Event> {
    const row = await this.db
      .prepare('insert into events (id, host_id, name, created_at) values (?, ?, ?, ?) returning *')
      .bind(generateId(), input.hostId, input.name, Date.now())
      .first<Row>();
    if (!row) throw new Error('Failed to create event');
    return toEvent(row);
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const row = await this.db.prepare('select * from events where id = ?').bind(eventId).first<Row>();
    return row ? toEvent(row) : null;
  }

  async listEvents(hostId: string): Promise<Event[]> {
    const { results } = await this.db
      .prepare('select * from events where host_id = ? order by created_at desc')
      .bind(hostId)
      .all<Row>();
    return results.map(toEvent);
  }

  async listGamesByEvent(eventId: string): Promise<Game[]> {
    const { results } = await this.db
      .prepare('select * from games where event_id = ? order by created_at desc')
      .bind(eventId)
      .all<Row>();
    return results.map(toGame);
  }

  // ── Games ──────────────────────────────────────────────────────────────────

  async createGame(input: CreateGameInput): Promise<Game> {
    const db = this.db;
    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const existing = await db.prepare('select id from games where join_code = ?').bind(joinCode).first<Row>();
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const questions = input.questions.map((q, idx) => ({ ...q, id: generateId(), order: idx }));

    const row = await db
      .prepare(
        `insert into games
          (id, event_id, host_id, join_code, mode, game_mode, title, description, scene, lose_rule, casts, questions, status, is_preset, current_question_index, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         returning *`
      )
      .bind(
        generateId(),
        input.eventId ?? null,
        input.hostId ?? null,
        joinCode,
        input.mode,
        input.gameMode,
        input.title,
        input.description ?? null,
        input.scene ?? null,
        input.loseRule ?? null,
        JSON.stringify(input.casts ?? []),
        JSON.stringify(questions),
        'draft',
        0,
        -1,
        Date.now()
      )
      .first<Row>();
    if (!row) throw new Error('Failed to create game');
    return toGame(row);
  }

  async getGame(gameId: string): Promise<Game | null> {
    const row = await this.db.prepare('select * from games where id = ?').bind(gameId).first<Row>();
    return row ? toGame(row) : null;
  }

  async getGameByCode(code: string): Promise<Game | null> {
    const row = await this.db
      .prepare('select * from games where join_code = ?')
      .bind(code.toUpperCase())
      .first<Row>();
    return row ? toGame(row) : null;
  }

  async listPresets(): Promise<Game[]> {
    const { results } = await this.db
      .prepare('select * from games where is_preset = 1 order by scene asc, title asc')
      .all<Row>();
    return results.map(toGame);
  }

  async updateGameStatus(gameId: string, status: GameStatus, extra?: Partial<Game>): Promise<Game> {
    const sets = ['status = ?'];
    const binds: unknown[] = [status];
    if (extra?.currentQuestionIndex !== undefined) { sets.push('current_question_index = ?'); binds.push(extra.currentQuestionIndex); }
    if (extra?.currentQuestionStartedAt !== undefined) { sets.push('current_question_started_at = ?'); binds.push(extra.currentQuestionStartedAt); }
    if (extra?.endedAt !== undefined) { sets.push('ended_at = ?'); binds.push(extra.endedAt); }
    binds.push(gameId);

    const row = await this.db
      .prepare(`update games set ${sets.join(', ')} where id = ? returning *`)
      .bind(...binds)
      .first<Row>();
    if (!row) throw new Error('Failed to update game');
    return toGame(row);
  }

  async advanceQuestion(gameId: string): Promise<Game> {
    const game = await this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    const { status, currentQuestionIndex, questions } = game;

    const sets: string[] = [];
    const binds: unknown[] = [];
    const set = (col: string, val: unknown) => { sets.push(`${col} = ?`); binds.push(val); };

    if (status === 'lobby') {
      set('status', 'question');
      set('current_question_index', 0);
      set('current_question_started_at', Date.now());
    } else if (status === 'question') {
      set('status', 'reveal');
    } else if (status === 'reveal') {
      const next = currentQuestionIndex + 1;
      if (next < questions.length) {
        set('status', 'question');
        set('current_question_index', next);
        set('current_question_started_at', Date.now());
      } else {
        set('status', 'ended');
        set('ended_at', Date.now());
      }
    } else {
      throw new Error(`Cannot advance from status: ${status}`);
    }

    binds.push(gameId);
    const row = await this.db
      .prepare(`update games set ${sets.join(', ')} where id = ? returning *`)
      .bind(...binds)
      .first<Row>();
    if (!row) throw new Error('Failed to advance');
    return toGame(row);
  }

  async updateGameQuestions(gameId: string, questions: Question[]): Promise<Game> {
    const row = await this.db
      .prepare('update games set questions = ? where id = ? returning *')
      .bind(JSON.stringify(questions), gameId)
      .first<Row>();
    if (!row) throw new Error('Failed to update questions');
    return toGame(row);
  }

  async updateGameCasts(gameId: string, casts: string[]): Promise<Game> {
    const row = await this.db
      .prepare('update games set casts = ? where id = ? returning *')
      .bind(JSON.stringify(casts), gameId)
      .first<Row>();
    if (!row) throw new Error('Failed to update casts');
    return toGame(row);
  }

  async resetGame(gameId: string): Promise<Game> {
    const db = this.db;
    await db.batch([
      db.prepare('delete from answers where game_id = ?').bind(gameId),
      db.prepare('delete from players where game_id = ?').bind(gameId),
      db
        .prepare('update games set status = ?, current_question_index = ?, current_question_started_at = NULL, ended_at = NULL where id = ?')
        .bind('lobby', -1, gameId),
    ]);
    const game = await this.getGame(gameId);
    if (!game) throw new Error('Game not found after reset');
    return game;
  }

  async findLatestLobbyGame(hostId: string, exceptGameId?: string): Promise<{ id: string; joinCode: string } | null> {
    const sql = exceptGameId
      ? "select id, join_code from games where host_id = ? and status = 'lobby' and id != ? order by created_at desc limit 1"
      : "select id, join_code from games where host_id = ? and status = 'lobby' order by created_at desc limit 1";
    const binds = exceptGameId ? [hostId, exceptGameId] : [hostId];
    const row = await this.db.prepare(sql).bind(...binds).first<Row>();
    if (!row) return null;
    return { id: row.id as string, joinCode: row.join_code as string };
  }

  // ── Players ────────────────────────────────────────────────────────────────

  async addPlayer(gameId: string, displayName: string): Promise<Player> {
    const row = await this.db
      .prepare('insert into players (id, game_id, display_name, joined_at) values (?, ?, ?, ?) returning *')
      .bind(generateId(), gameId, displayName, Date.now())
      .first<Row>();
    if (!row) throw new Error('Failed to add player');
    return toPlayer(row);
  }

  async listPlayers(gameId: string): Promise<Player[]> {
    const { results } = await this.db
      .prepare('select * from players where game_id = ? order by joined_at asc')
      .bind(gameId)
      .all<Row>();
    return results.map(toPlayer);
  }

  // ── Answers ────────────────────────────────────────────────────────────────

  async submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
    const game = await this.getGame(input.gameId);
    const responseTimeMs = game?.currentQuestionStartedAt ? Date.now() - game.currentQuestionStartedAt : 0;
    // upsert: 出題中は回答の変更を許可
    const row = await this.db
      .prepare(
        `insert into answers (id, game_id, player_id, question_id, choice_index, answered_at, response_time_ms)
         values (?, ?, ?, ?, ?, ?, ?)
         on conflict(player_id, question_id) do update set
           choice_index = excluded.choice_index,
           answered_at = excluded.answered_at,
           response_time_ms = excluded.response_time_ms
         returning *`
      )
      .bind(generateId(), input.gameId, input.playerId, input.questionId, input.choiceIndex, Date.now(), responseTimeMs)
      .first<Row>();
    if (!row) throw new Error('Failed to submit answer');
    return toAnswer(row);
  }

  async listAnswers(gameId: string, questionId?: string): Promise<Answer[]> {
    const stmt = questionId
      ? this.db.prepare('select * from answers where game_id = ? and question_id = ?').bind(gameId, questionId)
      : this.db.prepare('select * from answers where game_id = ?').bind(gameId);
    const { results } = await stmt.all<Row>();
    return results.map(toAnswer);
  }
}
