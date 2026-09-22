import type { AnswerTarget, Game, Player, Answer, Question, Score } from '@/types/domain';

/** 参加者プレースホルダ（プレイヤーA / Aさん）。 */
export const PLAYER_PLACEHOLDER = /^[A-Z]さん$|^プレイヤー[A-Z]$/;
/** キャストプレースホルダ（キャストA）。 */
export const CAST_PLACEHOLDER = /^キャスト[A-Z]$/;
/** 自己参照の固定肢。参加者を実名で並べる players 設問では冗長なので落とす。 */
export const SELF_LITERAL = /^(自分|自分自身|私)$/;

/**
 * 設問の選択肢を解決する唯一の関数。
 * 「プレイヤーA/B/C＋自分」のような混在設問に対応:
 *   プレースホルダ枠は実名(参加者/キャスト)で置換し、それ以外の固定肢(自分/お客様本人 等)は保持。
 * - players: プレースホルダを参加者名に。参加者0名なら置換せず原文維持。
 * - casts:   プレースホルダをキャスト名に。キャスト未設定なら原文維持。
 * - fixed(既定): q.options をそのまま。
 */
export function resolveOptions(
  q: Question,
  ctx: { playerNames: string[]; casts: string[] }
): string[] {
  const target: AnswerTarget = q.answerTarget ?? 'fixed';
  if (target === 'players') {
    if (ctx.playerNames.length === 0) return q.options; // 0名なら維持
    // プレースホルダ枠と「自分」(冗長な自己参照)を除いた固定肢のみ残す
    const extras = q.options.filter((o) => !PLAYER_PLACEHOLDER.test(o) && !SELF_LITERAL.test(o));
    return [...ctx.playerNames, ...extras];
  }
  if (target === 'casts') {
    if (ctx.casts.length === 0) return q.options; // 未設定なら維持
    const extras = q.options.filter((o) => !CAST_PLACEHOLDER.test(o));
    return [...ctx.casts, ...extras];
  }
  return q.options;
}

/**
 * この設問が採点対象か（採点可否は導出。二重に持たない）。
 * fixed かつ correctIndex がある場合のみ採点する。
 */
export function isScored(q: Question): boolean {
  return (q.answerTarget ?? 'fixed') === 'fixed' && q.correctIndex != null;
}

export function calculatePoints(answer: Answer, question: Question): number {
  // 人当て/キャスト指名（fixed 以外）は常に非採点。
  // データ修正漏れがあっても採点しないための恒久ガード（不一致①の最終防波堤）。
  if ((question.answerTarget ?? 'fixed') !== 'fixed') return 0;
  if (question.correctIndex === undefined) return 0;
  if (answer.choiceIndex !== question.correctIndex) return 0;

  return 1;
}

export function computeLeaderboard(game: Game, answers: Answer[], players: Player[]): Score[] {
  const scoreMap = new Map<string, Score>();

  for (const player of players) {
    scoreMap.set(player.id, {
      playerId: player.id,
      displayName: player.displayName,
      totalPoints: 0,
      correctCount: 0,
    });
  }

  for (const answer of answers) {
    const question = game.questions.find((q) => q.id === answer.questionId);
    if (!question) continue;

    const points = calculatePoints(answer, question);
    const entry = scoreMap.get(answer.playerId);
    if (!entry) continue;

    entry.totalPoints += points;
    if (points > 0) {
      entry.correctCount += 1;
    }
  }

  return Array.from(scoreMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}
