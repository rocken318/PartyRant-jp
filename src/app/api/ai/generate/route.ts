export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { store } from '@/lib/store';

const schema = z.object({
  theme: z.string().min(1).max(50).transform(s => s.replace(/[`"\\]/g, '').trim()),
  mode: z.enum(['trivia', 'polling', 'opinion']),
  count: z.number().int().min(3).max(15),
  loseRule: z.enum(['minority', 'majority']).optional(),
});

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function buildPrompt(theme: string, mode: string, count: number): string {
  if (mode === 'trivia') {
    return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、日本語の4択クイズを${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "問題文", "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"], "correctIndex": 0, "timeLimitSec": 15}]}

条件：
- 盛り上がる・驚き・笑えるパーティー向けの内容
- 正解は options[correctIndex] に対応（0〜3）
- correctIndex は 0〜3 をバランスよく分散させる（全問同じ番号にしない）
- timeLimitSec は難易度に応じて 10〜20 の整数
- 日本語で出力`;
  }

  if (mode === 'polling') {
    return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、参加者の本音を引き出すアンケート問題を${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "質問文", "options": ["選択肢A", "選択肢B"], "correctIndex": null, "timeLimitSec": 12}]}

条件：
- 正解がなく、みんなの意見・好み・習慣を投票する問題
- 選択肢は2〜4個
- correctIndex は必ず null
- 参加者同士の会話が弾む内容
- 日本語で出力`;
  }

  return `あなたはパーティーゲームの問題作成AIです。
テーマ「${theme}」について、グループで多数派・少数派に分かれる問題を${count}問作ってください。

以下のJSON形式で返してください：
{"questions": [{"text": "質問文", "options": ["選択肢A", "選択肢B"], "correctIndex": null, "timeLimitSec": 12}]}

条件：
- どちらが多数派かわからないくらい意見が割れる問題
- 盛り上がる・笑える・本音が出る内容
- 選択肢は2〜3個
- correctIndex は必ず null
- 日本語で出力`;
}

interface RawQuestion {
  text: unknown;
  options: unknown;
  correctIndex: unknown;
  timeLimitSec: unknown;
}

function validateQuestions(raw: unknown): Array<{
  text: string;
  options: string[];
  correctIndex?: number;
  timeLimitSec: number;
}> {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { questions?: unknown }).questions)) {
    throw new Error('Invalid response structure');
  }

  const questions = (raw as { questions: RawQuestion[] }).questions;

  return questions.map((q, i) => {
    if (typeof q.text !== 'string' || !q.text.trim()) throw new Error(`Question ${i}: missing text`);
    if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Question ${i}: invalid options`);
    const options = q.options.map((o: unknown) => String(o));
    const rawCorrectIndex = q.correctIndex === null || q.correctIndex === undefined
      ? null
      : typeof q.correctIndex === 'number' ? q.correctIndex : null;
    // Validate range if not null
    const correctIndex = rawCorrectIndex !== null && rawCorrectIndex >= 0 && rawCorrectIndex < options.length
      ? rawCorrectIndex
      : rawCorrectIndex === null ? null : 0; // clamp to 0 if out of range
    const timeLimitSec = typeof q.timeLimitSec === 'number'
      ? Math.max(10, Math.min(25, q.timeLimitSec))
      : 15;
    return { text: q.text.trim(), options, ...(correctIndex !== null ? { correctIndex } : {}), timeLimitSec };
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { theme, mode, count, loseRule } = parsed.data;

    const prompt = buildPrompt(theme, mode, count);

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      console.error('OpenAI returned invalid JSON:', content.slice(0, 200));
      throw new Error('Invalid JSON from OpenAI');
    }
    const questions = validateQuestions(raw).slice(0, count);

    if (questions.length < count) {
      console.warn(`Requested ${count} questions but got ${questions.length}`);
    }

    if (questions.length === 0) throw new Error('No questions generated');

    const modeLabel: Record<string, string> = {
      trivia: '🧠',
      polling: '📊',
      opinion: loseRule === 'minority' ? '🦄' : '🐑',
    };

    const game = await store.createGame({
      mode,
      gameMode: 'live',
      ...(mode === 'opinion' && loseRule ? { loseRule } : {}),
      title: `${modeLabel[mode]} ${theme}`,
      questions,
    });

    const lobbyGame = await store.updateGameStatus(game.id, 'lobby');
    return NextResponse.json(lobbyGame);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }
}
