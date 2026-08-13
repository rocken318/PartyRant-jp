// D1 の最小型定義 + OpenNext の CloudflareEnv 拡張。
//
// 注意: `wrangler types` が生成する worker-configuration.d.ts は
// @cloudflare/workers-types 全体をグローバルに注入し、DOM の Response.json()
// (Promise<any>) を Workers 版 (Promise<unknown>) で上書きしてクライアント
// コンポーネントの型を壊す。そのため生成ファイルは使わず、アプリで実際に使う
// D1 API サブセットだけをここで ambient 宣言する。
// （`wrangler types` を再実行して worker-configuration.d.ts が復活したら削除すること。）

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

// ── Durable Objects (最小サブセット) ─────────────────────────────────────────
// 同じく workers-types 全体をグローバルに引き込むと DOM Response を壊すため、
// GameRoom DO と GAME_ROOM バインディングに必要な型だけを ambient 宣言する。

interface DurableObjectId {
  toString(): string;
  readonly name?: string;
}

interface DurableObjectState {
  waitUntil(promise: Promise<unknown>): void;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  readonly id: DurableObjectId;
}

interface DurableObjectStub {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(hex: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

declare module 'cloudflare:workers' {
  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    protected ctx: DurableObjectState;
    protected env: Env;
  }
}

// OpenNext の getCloudflareContext().env が参照する CloudflareEnv を拡張。
interface CloudflareEnv {
  DB: D1Database;
  GAME_ROOM: DurableObjectNamespace;
}
