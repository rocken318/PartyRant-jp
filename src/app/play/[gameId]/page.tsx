import { PlayGameClient } from './PlayGameClient';

export default async function PlayGamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <PlayGameClient gameId={gameId} />;
}
