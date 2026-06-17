import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      name: true,
      email: true,
      gamesPlayed: true,
      gamesWon: true,
      createdAt: true,
      gameDefinitions: {
        where: { isPublished: true },
        select: { id: true, name: true, playCount: true, createdAt: true },
        orderBy: { playCount: 'desc' },
      },
    },
  })

  if (!user) redirect('/sign-in')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="card-panel mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          {user.username ?? user.name}
        </h1>
        <p className="text-gray-400 text-sm">{user.email}</p>
        <p className="text-gray-500 text-xs mt-1">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{user.gamesPlayed}</div>
            <div className="text-xs text-gray-400">Games Played</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{user.gamesWon}</div>
            <div className="text-xs text-gray-400">Games Won</div>
          </div>
        </div>
      </div>

      {user.gameDefinitions.length > 0 && (
        <div className="card-panel">
          <h2 className="font-semibold text-white mb-3">Your Created Games</h2>
          <div className="space-y-2">
            {user.gameDefinitions.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-gray-200 text-sm">{g.name}</span>
                <span className="text-xs text-gray-500">{g.playCount} plays</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
