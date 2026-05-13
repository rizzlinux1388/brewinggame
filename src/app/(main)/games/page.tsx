import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function GamesPage() {
  const games = await prisma.gameDefinition.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
      minPlayers: true,
      maxPlayers: true,
      estimatedMinutes: true,
      isBuiltIn: true,
      playCount: true,
      author: { select: { username: true } },
    },
    orderBy: [{ isBuiltIn: 'desc' }, { playCount: 'desc' }],
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">All Games</h1>
        <Link href="/builder" className="btn-primary text-sm">
          + Create Game
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <div key={game.id} className="card-panel flex flex-col">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white">{game.name}</h3>
                {game.isBuiltIn && (
                  <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">
                    Classic
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{game.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {game.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="text-xs text-gray-500">
                {game.minPlayers}–{game.maxPlayers} players · ~{game.estimatedMinutes} min
                {game.author?.username && ` · by ${game.author.username}`}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/lobby?game=${game.id}`} className="btn-primary text-sm flex-1 text-center">
                Play
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
