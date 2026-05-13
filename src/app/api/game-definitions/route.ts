import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GameDefinitionSchema } from '@/lib/validations/game-definition.schema'
import { z } from 'zod'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const builtIn = searchParams.get('builtIn')
  const tag = searchParams.get('tag')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = { isPublished: true }
  if (builtIn === 'true') where.isBuiltIn = true
  if (tag) where.tags = { has: tag }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const games = await prisma.gameDefinition.findMany({
    where,
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
      rating: true,
      author: { select: { username: true } },
    },
    orderBy: [{ isBuiltIn: 'desc' }, { playCount: 'desc' }],
    take: 50,
  })

  return NextResponse.json(games)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = GameDefinitionSchema.safeParse(body.schema ?? body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid game schema', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const def = parsed.data

    const game = await prisma.gameDefinition.create({
      data: {
        id: def.id,
        name: def.name,
        description: def.description,
        schema: def as object,
        tags: def.tags,
        minPlayers: def.minPlayers,
        maxPlayers: def.maxPlayers,
        estimatedMinutes: def.estimatedMinutes,
        isBuiltIn: false,
        isPublished: body.isPublished ?? false,
        createdByAI: body.createdByAI ?? false,
        aiPrompt: body.aiPrompt ?? null,
        authorId: session.user.id,
        version: '1.0',
      },
    })

    return NextResponse.json(game, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
