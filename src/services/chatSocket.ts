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

  // Send token in both the URL query param AND the STOMP CONNECT headers.
  // Spring Boot's AbstractSecurityWebSocketMessageBrokerConfigurer reads the
  // token from the HTTP upgrade handshake (URL param) for the WebSocket,
  // but the STOMP broker layer may also check Authorization headers sent in
  // the STOMP CONNECT frame. Sending both maximises compatibility.
  const wsUrl = `${WS_BASE}?token=${encodeURIComponent(token)}`;
  console.log('[chatSocket] Connecting to', WS_BASE, '— token length:', token.length);

  client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      // Some Spring STOMP configs also read 'login'/'passcode' fields
      login: token,
    },
    reconnectDelay: 5000,
    // Heartbeats disabled — React Native timers can't sustain the ping interval
    // reliably under Hermes, causing premature disconnects.
    heartbeatIncoming: 0,
    heartbeatOutgoing: 0,
    // Hermes sometimes strips the STOMP NULL terminator from incoming frames.
    // appendMissingNULLonIncoming re-adds it so the frame parser doesn't stall.
    appendMissingNULLonIncoming: true,
    // Keep binary frames off — Hermes WebSocket serialises TextEncoder output
    // as Uint8Array which the Spring STOMP broker may not expect.
    forceBinaryWSFrames: false,
    debug: (msg: string) => console.log('[STOMP]', msg),
    onConnect: () => {
      console.log('[chatSocket] CONNECTED ✅');
      handlers.onConnect?.();
    },
    onWebSocketClose: (event: any) => {
      console.log('[chatSocket] WS CLOSED', event?.code, event?.reason);
      handlers.onDisconnect?.();
    },
    onStompError: (frame) => {
      console.log('[chatSocket] STOMP ERROR:', frame.headers, frame.body);
      handlers.onError?.(frame.headers?.message ?? frame);
    },
    onWebSocketError: (event) => {
      console.log('[chatSocket] WS ERROR:', event);
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
