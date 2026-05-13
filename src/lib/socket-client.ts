import { io, Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@/types/socket-events'

export type TypedClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: TypedClientSocket | null = null

export function getSocket(): TypedClientSocket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): TypedClientSocket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  socket?.disconnect()
}
