import apiClient, { extractArray } from './axios';
import { ChatRoom, ChatMessage } from '../types';
import { USE_MOCK_DATA } from '../config';
import { mockDelay } from '../mock/mockHelpers';

// Fallback conversation shown only when USE_MOCK_DATA is on (no live backend).
const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', senderId: 'mock-other', senderName: 'AgroChain User', content: 'Hello! I am interested in your listing on AgroChain.', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: '2', senderId: 'mock-self', senderName: 'You', content: 'Welcome! Thank you for reaching out.', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 27).toISOString() },
  { id: '3', senderId: 'mock-other', senderName: 'AgroChain User', content: 'Which region are you farming in?', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 24).toISOString() },
  { id: '4', senderId: 'mock-self', senderName: 'You', content: 'I am in the Ashanti region, around Kumasi.', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 21).toISOString() },
];

export async function getRooms(): Promise<ChatRoom[]> {
  if (USE_MOCK_DATA) return mockDelay([]);
  console.log('[chatApi] GET /chat/rooms');
  const { data } = await apiClient.get<any>('/chat/rooms');
  const rooms = extractArray<ChatRoom>(data);
  console.log('[chatApi] /chat/rooms ->', rooms.length, 'room(s)');
  return rooms;
}

export async function getOrCreateRoom(otherUserId: string): Promise<ChatRoom> {
  if (USE_MOCK_DATA) {
    return mockDelay({
      id: 'mock-room',
      participant1: null as any,
      participant2: null as any,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    });
  }
  console.log('[chatApi] POST /chat/rooms { otherUserId:', otherUserId, '}');
  const { data } = await apiClient.post<ChatRoom>('/chat/rooms', { otherUserId });
  console.log('[chatApi] Room resolved, id:', data.id);
  return data;
}

export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_MESSAGES);
  console.log('[chatApi] GET /chat/rooms/' + roomId + '/messages');
  const { data } = await apiClient.get<any>(`/chat/rooms/${roomId}/messages`);
  const msgs = extractArray<ChatMessage>(data);
  console.log('[chatApi] /messages ->', msgs.length, 'message(s)');
  return msgs;
}

export async function markRead(roomId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  console.log('[chatApi] PATCH /chat/rooms/' + roomId + '/read');
  await apiClient.patch(`/chat/rooms/${roomId}/read`);
}
