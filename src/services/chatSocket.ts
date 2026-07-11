import { io, Socket } from 'socket.io-client';
import { ChatSocketMessage } from '../types';

// Derive Socket.IO URL from the REST API base URL — same host, port 9092.
// 'http://172.20.10.2:8080/api' → 'http://172.20.10.2:9092'
function getSocketIOUrl(apiBaseUrl: string): string {
  try {
    const u = new URL(apiBaseUrl);
    u.port = '9092';
    u.pathname = '/';
    return u.origin;
  } catch {
    return apiBaseUrl.replace(/:\d+\/.*$/, ':9092');
  }
}

const BASE_URL = 'http://172.20.10.2:8080/api';
export const SOCKET_URL = getSocketIOUrl(BASE_URL); // 'http://172.20.10.2:9092'

let socket: Socket | null = null;

export interface ChatSocketHandlers {
  onMessage: (message: ChatSocketMessage) => void;
  onConnect?: () => void;
  onError?: (error: unknown) => void;
}

export function connect(
  token: string,
  roomId: string,
  handlers: ChatSocketHandlers,
): void {
  if (socket) {
    console.log('[SocketIO] Disconnecting stale socket before reconnect');
    socket.disconnect();
    socket = null;
  }

  console.log('[SocketIO] Connecting to', SOCKET_URL, '— room:', roomId);

  socket = io(SOCKET_URL, {
    // 'polling' first: long-polling works through carrier-grade NAT and hotspots
    // that drop raw WebSocket frames. The client auto-upgrades to WebSocket if
    // the connection stays stable.
    transports: ['polling', 'websocket'],
    auth: { token },
    query: { token },
    reconnection: true,
    reconnectionDelay: 3000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[SocketIO] connected — id:', socket?.id);
    socket?.emit('join_room', { roomId });
    console.log('[SocketIO] joined room', roomId);
    handlers.onConnect?.();
  });

  socket.on('new_message', (message: ChatSocketMessage) => {
    console.log('[SocketIO] message received from', message.senderName, ':', message.content?.slice(0, 60));
    handlers.onMessage(message);
  });

  socket.on('connect_error', (error: Error) => {
    console.log('[SocketIO] connect_error:', error.message);
    handlers.onError?.(error);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[SocketIO] disconnected:', reason);
  });

  socket.on('error', (error: unknown) => {
    console.log('[SocketIO] error:', error);
    handlers.onError?.(error);
  });
}

export function sendMessage(
  roomId: string,
  content: string,
  extra?: Record<string, unknown>,
): void {
  if (!socket) throw new Error('[SocketIO] No socket — call connect() first');
  console.log('[SocketIO] send_message → room:', roomId, '|', content.slice(0, 60));
  socket.emit('send_message', { roomId, content, ...extra });
}

export function disconnect(): void {
  if (socket) {
    console.log('[SocketIO] disconnecting');
    socket.disconnect();
    socket = null;
  }
}
