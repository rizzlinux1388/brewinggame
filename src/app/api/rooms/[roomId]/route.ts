import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const room = await prisma.gameRoom.findUnique({
    where: { id: params.roomId },
    select: { hostId: true, status: true },
  })

  if (!room) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (room.status === 'IN_PROGRESS') {
    return NextResponse.json({ error: 'Cannot close a game in progress' }, { status: 409 })
  }

  await prisma.gameRoom.delete({ where: { id: params.roomId } })
  return new NextResponse(null, { status: 204 })
}
