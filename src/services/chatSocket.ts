import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { ChatSocketMessage } from '../types';

const WS_URL = 'ws://172.20.10.2:8080/api/ws';

let client: Client | null = null;

export interface ChatSocketHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

export function connect(token: string, handlers: ChatSocketHandlers = {}): Client {
  if (client) {
    disconnect();
  }

  client = new Client({
    brokerURL: `${WS_URL}?token=${encodeURIComponent(token)}`,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => handlers.onConnect?.(),
    onWebSocketClose: () => handlers.onDisconnect?.(),
    onStompError: (frame) => handlers.onError?.(frame.headers?.message ?? frame),
    onWebSocketError: (event) => handlers.onError?.(event),
  });

  client.activate();
  return client;
}

export function subscribeToRoom(
  roomId: string,
  onMessage: (message: ChatSocketMessage) => void
): StompSubscription | null {
  if (!client || !client.connected) return null;

  return client.subscribe(`/topic/chat/${roomId}`, (frame: IMessage) => {
    try {
      const payload = JSON.parse(frame.body) as ChatSocketMessage;
      onMessage(payload);
    } catch (e) {
      console.warn('[chatSocket] Failed to parse incoming message', e);
    }
  });
}

export function sendMessage(roomId: string, content: string): void {
  if (!client || !client.connected) {
    throw new Error('Chat socket is not connected');
  }
  client.publish({
    destination: `/app/chat/${roomId}`,
    body: JSON.stringify({ content }),
  });
}

export function isConnected(): boolean {
  return client?.connected ?? false;
}

export function disconnect(): void {
  if (client) {
    client.deactivate();
    client = null;
  }
}
