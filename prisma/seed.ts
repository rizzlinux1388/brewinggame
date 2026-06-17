import { PrismaClient } from '@prisma/client'
import { heartsDefinition } from '../src/engine/built-in-games/hearts'
import { spadesDefinition } from '../src/engine/built-in-games/spades'
import { goFishDefinition } from '../src/engine/built-in-games/goFish'
import { crazyEightsDefinition } from '../src/engine/built-in-games/crazyEights'
import { warDefinition } from '../src/engine/built-in-games/war'
import type { GameDefinition } from '../src/types/game-definition'

const prisma = new PrismaClient()

const builtInGames: GameDefinition[] = [
  heartsDefinition,
  spadesDefinition,
  goFishDefinition,
  crazyEightsDefinition,
  warDefinition,
]

async function main() {
  console.log('Seeding built-in games...')

  for (const game of builtInGames) {
    await prisma.gameDefinition.upsert({
      where: { id: game.id },
      update: {
        name: game.name,
        description: game.description,
        schema: game as object,
        tags: game.tags,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        estimatedMinutes: game.estimatedMinutes,
        isPublished: true,
      },
      create: {
        id: game.id,
        name: game.name,
        description: game.description,
        schema: game as object,
        tags: game.tags,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        estimatedMinutes: game.estimatedMinutes,
        isBuiltIn: true,
        isPublished: true,
        version: '1.0',
      },
    })

    console.log(`  ✓ ${game.name}`)
  }

  console.log('Done!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
