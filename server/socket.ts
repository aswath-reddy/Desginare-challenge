import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Join personal user room for direct notifications
    socket.on('join_user', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Join activity room for group chat
    socket.on('join_activity', (activityId: string) => {
      if (activityId) {
        socket.join(`activity_${activityId}`);
      }
    });

    // Leave activity room
    socket.on('leave_activity', (activityId: string) => {
      if (activityId) {
        socket.leave(`activity_${activityId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet.');
  }
  return io;
}

export function emitNotification(recipientId: string, notification: unknown): void {
  if (io) {
    io.to(`user_${recipientId}`).emit('notification', notification);
  }
}

export function emitActivityMessage(activityId: string, message: unknown): void {
  if (io) {
    io.to(`activity_${activityId}`).emit('new_message', message);
  }
}

export function emitActivityUpdate(activityId: string, payload: unknown): void {
  if (io) {
    io.to(`activity_${activityId}`).emit('activity_updated', payload);
  }
}
