import { getDb } from '@/lib/cloudflare/context';

export type Plan = 'free' | 'pro';

export interface Profile {
  id: string;
  plan: Plan;
  aiGenCount: number;
  aiGenResetAt: Date;
}

type Row = Record<string, unknown>;

// ai_gen_reset_at は D1 では epoch ms (INTEGER) で保持する。

/** Get or create a user's profile. Safe to call on every request. */
export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const db = getDb();
  const row = await db.prepare('select * from profiles where id = ?').bind(userId).first<Row>();
  if (row) {
    return {
      id: row.id as string,
      plan: row.plan as Plan,
      aiGenCount: row.ai_gen_count as number,
      aiGenResetAt: new Date(row.ai_gen_reset_at as number),
    };
  }
  // プロフィール未作成のユーザー — lazy 生成（Supabase トリガー廃止の代替）
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  const created = await db
    .prepare('insert into profiles (id, plan, ai_gen_count, ai_gen_reset_at) values (?, ?, ?, ?) returning *')
    .bind(userId, 'free', 0, resetAt.getTime())
    .first<Row>();

  if (!created) throw new Error('Failed to create profile');
  return {
    id: created.id as string,
    plan: created.plan as Plan,
    aiGenCount: created.ai_gen_count as number,
    aiGenResetAt: new Date(created.ai_gen_reset_at as number),
  };
}

/** Count the user's non-preset games. */
export async function countUserGames(userId: string): Promise<number> {
  const db = getDb();
  const row = await db
    .prepare('select count(*) as n from games where host_id = ? and is_preset = 0')
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Check AI generation limit and increment counter if allowed.
 * Resets the counter if the reset date has passed.
 * Returns true if allowed, false if the free limit is reached.
 */
export async function checkAndIncrementAiGen(userId: string, profile: Profile): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  let count = profile.aiGenCount;
  let resetAt = profile.aiGenResetAt;

  // Reset if past reset date
  if (now >= resetAt) {
    count = 0;
    resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  if (profile.plan === 'free' && count >= 3) return false;

  const nextResetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const effectiveResetAt = now >= profile.aiGenResetAt ? nextResetAt : resetAt;
  await db
    .prepare('update profiles set ai_gen_count = ?, ai_gen_reset_at = ? where id = ?')
    .bind(count + 1, effectiveResetAt.getTime(), userId)
    .run();

  return true;
}

/** Update a user's plan. Used by the RevenueCat webhook. */
export async function setPlan(userId: string, plan: Plan): Promise<void> {
  const db = getDb();
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  await db
    .prepare(
      `insert into profiles (id, plan, ai_gen_count, ai_gen_reset_at) values (?, ?, ?, ?)
       on conflict(id) do update set
         plan = excluded.plan,
         ai_gen_count = excluded.ai_gen_count,
         ai_gen_reset_at = excluded.ai_gen_reset_at`
    )
    .bind(userId, plan, 0, resetAt.getTime())
    .run();
}
