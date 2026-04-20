import { createServerClient } from '@/lib/supabase/server';

export type Plan = 'free' | 'pro';

export interface Profile {
  id: string;
  plan: Plan;
  aiGenCount: number;
  aiGenResetAt: Date;
}

/** Get or create a user's profile. Safe to call on every request. */
export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const db = createServerClient();
  const { data } = await db.from('profiles').select().eq('id', userId).maybeSingle();
  if (data) {
    return {
      id: data.id as string,
      plan: data.plan as Plan,
      aiGenCount: data.ai_gen_count as number,
      aiGenResetAt: new Date(data.ai_gen_reset_at as string),
    };
  }
  // Existing user without profile — create it (new users get one via DB trigger)
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  const { data: created, error } = await db
    .from('profiles')
    .insert({
      id: userId,
      plan: 'free',
      ai_gen_count: 0,
      ai_gen_reset_at: resetAt.toISOString(),
    })
    .select()
    .single();

  if (error || !created) throw new Error(error?.message ?? 'Failed to create profile');
  return {
    id: created.id as string,
    plan: created.plan as Plan,
    aiGenCount: created.ai_gen_count as number,
    aiGenResetAt: new Date(created.ai_gen_reset_at as string),
  };
}

/** Count the user's non-preset games. */
export async function countUserGames(userId: string): Promise<number> {
  const db = createServerClient();
  const { count } = await db
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', userId)
    .eq('is_preset', false);
  return count ?? 0;
}

/**
 * Check AI generation limit and increment counter if allowed.
 * Resets the counter if the reset date has passed.
 * Returns true if allowed, false if the free limit is reached.
 */
export async function checkAndIncrementAiGen(userId: string, profile: Profile): Promise<boolean> {
  const db = createServerClient();
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
  await db
    .from('profiles')
    .update({
      ai_gen_count: count + 1,
      ai_gen_reset_at: (now >= profile.aiGenResetAt ? nextResetAt : resetAt).toISOString(),
    })
    .eq('id', userId);

  return true;
}

/** Update a user's plan. Used by the RevenueCat webhook. */
export async function setPlan(userId: string, plan: Plan): Promise<void> {
  const db = createServerClient();
  const resetAt = new Date();
  resetAt.setMonth(resetAt.getMonth() + 1, 1);
  resetAt.setHours(0, 0, 0, 0);

  await db
    .from('profiles')
    .upsert({
      id: userId,
      plan,
      ai_gen_count: 0,
      ai_gen_reset_at: resetAt.toISOString(),
    });
}
