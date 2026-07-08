import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { ChatSocketMessage } from '../types';

const WS_BASE = 'ws://172.20.10.2:8080/api/ws';

let client: Client | null = null;

export interface ChatSocketHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

export function connect(token: string, handlers: ChatSocketHandlers = {}): Client {
  if (client) {
    console.log('[chatSocket] Disconnecting existing client before reconnect');
    disconnect();
  }

  const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}`;
  console.log('[chatSocket] Connecting to', wsUrl);

  client = new Client({
    // webSocketFactory is the correct path for React Native / Hermes —
    // brokerURL relies on the STOMP client's internal WebSocket constructor
    // which can fail silently in Hermes. Passing the factory explicitly is safe on all platforms.
    webSocketFactory: () => new WebSocket(wsUrl),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      console.log('[chatSocket] Connected ✓');
      handlers.onConnect?.();
    },
    onWebSocketClose: (event: any) => {
      console.log('[chatSocket] WebSocket closed', event?.code, event?.reason);
      handlers.onDisconnect?.();
    },
    onStompError: (frame) => {
      console.log('[chatSocket] STOMP error:', frame.headers?.message);
      handlers.onError?.(frame.headers?.message ?? frame);
    },
    onWebSocketError: (event) => {
      console.log('[chatSocket] WebSocket error', event);
      handlers.onError?.(event);
    },
  });

  client.activate();
  return client;
}

export function subscribeToRoom(
  roomId: string,
  onMessage: (message: ChatSocketMessage) => void
): StompSubscription | null {
  if (!client || !client.connected) {
    console.log('[chatSocket] subscribeToRoom called but not connected');
    return null;
  }

  const dest = `/topic/chat/${roomId}`;
  console.log('[chatSocket] Subscribing to', dest);

  return client.subscribe(dest, (frame: IMessage) => {
    try {
      const payload = JSON.parse(frame.body) as ChatSocketMessage;
      console.log('[chatSocket] Received from', payload.senderName, '—', payload.content?.slice(0, 60));
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
  const dest = `/app/chat/${roomId}`;
  console.log('[chatSocket] Sending to', dest, '—', content.slice(0, 60));
  client.publish({
    destination: dest,
    body: JSON.stringify({ content }),
  });
}

export function isConnected(): boolean {
  return client?.connected ?? false;
}

export function disconnect(): void {
  if (client) {
    console.log('[chatSocket] Disconnecting');
    client.deactivate();
    client = null;
  }
}
