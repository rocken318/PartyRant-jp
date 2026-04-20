import type { Game, Player, Answer, Question, Score } from '@/types/domain';

export function calculatePoints(answer: Answer, question: Question): number {
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
