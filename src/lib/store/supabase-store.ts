import type { GameStore, CreateEventInput, CreateGameInput, SubmitAnswerInput } from './types';
import type { Game, GameStatus, Player, Answer, Event } from '@/types/domain';
import { createServerClient } from '@/lib/supabase/server';
import { generateId, generateJoinCode } from '@/lib/utils';

function toEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    hostId: row.host_id as string,
    name: row.name as string,
    createdAt: row.created_at as number,
  };
}

function toGame(row: Record<string, unknown>): Game {
  return {
    id: row.id as string,
    eventId: row.event_id as string | undefined,
    hostId: row.host_id as string | undefined,
    joinCode: row.join_code as string,
    mode: row.mode as Game['mode'],
    gameMode: (row.game_mode as Game['gameMode']) ?? 'live',
    title: row.title as string,
    description: row.description as string | undefined,
    scene: row.scene as string | undefined,
    isPreset: row.is_preset as boolean | undefined,
    questions: row.questions as Game['questions'],
    status: row.status as GameStatus,
    currentQuestionIndex: row.current_question_index as number,
    currentQuestionStartedAt: row.current_question_started_at as number | undefined,
    createdAt: row.created_at as number,
    endedAt: row.ended_at as number | undefined,
  };
}

function toPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    gameId: row.game_id as string,
    displayName: row.display_name as string,
    joinedAt: row.joined_at as number,
  };
}

function toAnswer(row: Record<string, unknown>): Answer {
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

export class SupabaseGameStore implements GameStore {
  private get db() { return createServerClient(); }

  // ── Events ─────────────────────────────────────────────────────────────────

  async createEvent(input: CreateEventInput): Promise<Event> {
    const { data, error } = await this.db
      .from('events')
      .insert({ id: generateId(), host_id: input.hostId, name: input.name, created_at: Date.now() })
      .select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create event');
    return toEvent(data);
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const { data } = await this.db.from('events').select().eq('id', eventId).maybeSingle();
    return data ? toEvent(data) : null;
  }

  async listEvents(hostId: string): Promise<Event[]> {
    const { data } = await this.db
      .from('events').select().eq('host_id', hostId).order('created_at', { ascending: false });
    return (data ?? []).map(toEvent);
  }

  async listGamesByEvent(eventId: string): Promise<Game[]> {
    const { data } = await this.db
      .from('games').select().eq('event_id', eventId).order('created_at', { ascending: false });
    return (data ?? []).map(toGame);
  }

  // ── Games ──────────────────────────────────────────────────────────────────

  async createGame(input: CreateGameInput): Promise<Game> {
    const db = this.db;
    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const { data } = await db.from('games').select('id').eq('join_code', joinCode).maybeSingle();
      if (!data) break;
      joinCode = generateJoinCode();
    }

    const questions = input.questions.map((q, idx) => ({ ...q, id: generateId(), order: idx }));

    const { data, error } = await db
      .from('games')
      .insert({
        id: generateId(),
        event_id: input.eventId ?? null,
        host_id: input.hostId ?? null,
        join_code: joinCode,
        mode: input.mode,
        game_mode: input.gameMode,
        title: input.title,
        description: input.description ?? null,
        scene: input.scene ?? null,
        questions,
        status: 'draft',
        current_question_index: -1,
        created_at: Date.now(),
      })
      .select().single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to create game');
    return toGame(data);
  }

  async getGame(gameId: string): Promise<Game | null> {
    const { data } = await this.db.from('games').select().eq('id', gameId).maybeSingle();
    return data ? toGame(data) : null;
  }

  async getGameByCode(code: string): Promise<Game | null> {
    const { data } = await this.db
      .from('games').select().eq('join_code', code.toUpperCase()).maybeSingle();
    return data ? toGame(data) : null;
  }

  async listPresets(): Promise<Game[]> {
    const { data } = await this.db
      .from('games')
      .select()
      .eq('is_preset', true)
      .order('scene', { ascending: true })
      .order('title', { ascending: true });
    return (data ?? []).map(toGame);
  }

  async updateGameStatus(gameId: string, status: GameStatus, extra?: Partial<Game>): Promise<Game> {
    const patch: Record<string, unknown> = { status };
    if (extra?.currentQuestionIndex !== undefined) patch.current_question_index = extra.currentQuestionIndex;
    if (extra?.currentQuestionStartedAt !== undefined) patch.current_question_started_at = extra.currentQuestionStartedAt;
    if (extra?.endedAt !== undefined) patch.ended_at = extra.endedAt;

    const { data, error } = await this.db
      .from('games').update(patch).eq('id', gameId).select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to update game');
    return toGame(data);
  }

  async advanceQuestion(gameId: string): Promise<Game> {
    const game = await this.getGame(gameId);
    if (!game) throw new Error('Game not found');
    const { status, currentQuestionIndex, questions } = game;
    let patch: Record<string, unknown>;

    if (status === 'lobby') {
      patch = { status: 'question', current_question_index: 0, current_question_started_at: Date.now() };
    } else if (status === 'question') {
      patch = { status: 'reveal' };
    } else if (status === 'reveal') {
      const next = currentQuestionIndex + 1;
      patch = next < questions.length
        ? { status: 'question', current_question_index: next, current_question_started_at: Date.now() }
        : { status: 'ended', ended_at: Date.now() };
    } else {
      throw new Error(`Cannot advance from status: ${status}`);
    }

    const { data, error } = await this.db
      .from('games').update(patch).eq('id', gameId).select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to advance');
    return toGame(data);
  }

  async addPlayer(gameId: string, displayName: string): Promise<Player> {
    const { data, error } = await this.db
      .from('players')
      .insert({ id: generateId(), game_id: gameId, display_name: displayName, joined_at: Date.now() })
      .select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to add player');
    return toPlayer(data);
  }

  async listPlayers(gameId: string): Promise<Player[]> {
    const { data } = await this.db.from('players').select().eq('game_id', gameId).order('joined_at');
    return (data ?? []).map(toPlayer);
  }

  async submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
    const game = await this.getGame(input.gameId);
    const responseTimeMs = game?.currentQuestionStartedAt ? Date.now() - game.currentQuestionStartedAt : 0;
    // upsert: allow changing answer while question is active
    const { data, error } = await this.db
      .from('answers')
      .upsert({
        id: generateId(),
        game_id: input.gameId,
        player_id: input.playerId,
        question_id: input.questionId,
        choice_index: input.choiceIndex,
        answered_at: Date.now(),
        response_time_ms: responseTimeMs,
      }, { onConflict: 'player_id,question_id', ignoreDuplicates: false })
      .select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to submit answer');
    return toAnswer(data);
  }

  async listAnswers(gameId: string, questionId?: string): Promise<Answer[]> {
    let query = this.db.from('answers').select().eq('game_id', gameId);
    if (questionId) query = query.eq('question_id', questionId);
    const { data } = await query;
    return (data ?? []).map(toAnswer);
  }
}
