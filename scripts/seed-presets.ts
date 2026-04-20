/**
 * seed-presets.ts
 * Imports files/partyrant_presets.json into Supabase as preset games.
 *
 * Usage:
 *   pnpm tsx scripts/seed-presets.ts
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── types ────────────────────────────────────────────────────────────────────

interface PresetQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

interface PresetGame {
  scene: string;
  title: string;
  mode: 'trivia' | 'polling' | 'opinion';
  loseRule?: 'minority' | 'majority';
  description: string;
  questions: PresetQuestion[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── helpers ─ directory loader ────────────────────────────────────────────────

function loadPresetsFromDir(dirPath: string): PresetGame[] {
  const result: PresetGame[] = [];
  const files = readdirSync(dirPath).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const data = JSON.parse(readFileSync(join(dirPath, f), 'utf-8'));
    // Each file is an array of PresetGame objects (filter out any stray non-object entries)
    const arr: PresetGame[] = (Array.isArray(data) ? data : [data])
      .filter((item: unknown) => item !== null && typeof item === 'object' && !Array.isArray(item) && (item as PresetGame).questions !== undefined);
    result.push(...arr);
  }
  return result;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const presets: PresetGame[] = [];

  // ── 既存プリセット（JSON files）
  const jsonFiles = [
    '../files/partyrant_presets.json',
    '../files/partyrant_majority_quiz_pack.json',
  ];
  for (const f of jsonFiles) {
    const filePath = join(__dirname, f);
    const data: PresetGame[] = JSON.parse(readFileSync(filePath, 'utf-8'));
    presets.push(...data);
    console.log(`  Loaded ${data.length} presets from ${f}`);
  }

  // ── 0420 追加コンテンツ（3,570問 / 372プリセット）
  const dirs0420 = [
    '../files/0420/partyrant_quizzes',
    '../files/0420/partyrant_quizzes_vol2',
    '../files/0420/partyrant_trivia_quizzes',
    '../files/0420b/partyrant_ultimate_choices',
  ];
  for (const d of dirs0420) {
    const dirPath = join(__dirname, d);
    const batch = loadPresetsFromDir(dirPath);
    presets.push(...batch);
    console.log(`  Loaded ${batch.length} presets from ${d}`);
  }

  console.log(`Total: ${presets.length} presets to insert.`);

  // Delete existing presets first (clean re-seed)
  const { error: delErr } = await supabase.from('games').delete().eq('is_preset', true);
  if (delErr) {
    console.warn('Warning: could not delete existing presets:', delErr.message);
  } else {
    console.log('Cleared existing presets.');
  }

  const now = Date.now();
  const rows = presets.map(preset => ({
    id: generateId(),
    event_id: null,
    host_id: null,
    join_code: generateJoinCode(),
    mode: preset.mode,
    lose_rule: preset.loseRule ?? null,
    game_mode: 'live',
    title: preset.title,
    description: preset.description,
    scene: preset.scene,
    is_preset: true,
    questions: preset.questions.map((q, i) => ({
      id: generateId(),
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      timeLimitSec: q.timeLimitSec,
      orderIndex: i,
    })),
    status: 'draft',
    current_question_index: 0,
    current_question_started_at: null,
    created_at: now,
    ended_at: null,
  }));

  // バッチinsert（50件ずつ）
  const BATCH = 50;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('games').insert(batch);
    if (error) {
      console.error(`  ✗ Batch ${i}–${i + batch.length - 1} failed: ${error.message}`);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`  ✓ Inserted batch ${i}–${i + batch.length - 1} (${inserted}/${rows.length})`);
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${failed} failed.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
