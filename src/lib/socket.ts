import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getClientSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
