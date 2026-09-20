import type { AnswerTarget, Game, Player, Answer, Question, Score } from '@/types/domain';

/**
 * 設問の選択肢を解決する唯一の関数。
 * - players: 参加者名で解決
 * - casts:   キャスト名で解決（Phase1 は casts 源が未整備なら現状の q.options を維持）
 * - fixed(既定): q.options をそのまま
 */
export function resolveOptions(
  q: Question,
  ctx: { playerNames: string[]; casts: string[] }
): string[] {
  const target: AnswerTarget = q.answerTarget ?? 'fixed';
  switch (target) {
    case 'players':
      return ctx.playerNames;
    case 'casts':
      return ctx.casts.length ? ctx.casts : q.options;
    case 'fixed':
    default:
      return q.options;
  }
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
