import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { nanoid } from '@/server/nanoid'

const CreateRoomSchema = z.object({
  gameDefinitionId: z.string(),
  mode: z.enum(['REALTIME', 'ASYNC', 'AI_SOLO']).default('REALTIME'),
  isPrivate: z.boolean().default(false),
  aiCount: z.number().int().min(0).max(9).default(0),
})

export async function GET() {
  const rooms = await prisma.gameRoom.findMany({
    where: { status: 'WAITING', isPrivate: false },
    include: {
      gameDefinition: { select: { name: true, minPlayers: true, maxPlayers: true } },
      participants: { select: { seatPosition: true, type: true, isConnected: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json(rooms)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = CreateRoomSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { gameDefinitionId, mode, isPrivate, aiCount } = parsed.data

    const gameDef = await prisma.gameDefinition.findUnique({
      where: { id: gameDefinitionId },
    })

    if (!gameDef) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const room = await prisma.gameRoom.create({
      data: {
        code: nanoid(6).toUpperCase(),
        gameDefinitionId,
        mode,
        isPrivate,
        maxPlayers: gameDef.maxPlayers,
        hostId: session.user.id,
        participants: {
          create: [
            {
              seatPosition: 0,
              type: 'HUMAN',
              userId: session.user.id,
              isConnected: false,
            },
            ...Array.from({ length: aiCount }, (_, i) => ({
              seatPosition: i + 1,
              type: 'AI' as const,
              aiDifficulty: 'medium',
              isConnected: true,
            })),
          ],
        },
      },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
