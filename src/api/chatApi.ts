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
  const { data } = await apiClient.get<any>('/chat/rooms');
  return extractArray<ChatRoom>(data);
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
  const { data } = await apiClient.post<ChatRoom>('/chat/rooms', { otherUserId });
  return data;
}

export async function getMessages(roomId: string): Promise<ChatMessage[]> {
  if (USE_MOCK_DATA) return mockDelay(MOCK_MESSAGES);
  const { data } = await apiClient.get<any>(`/chat/rooms/${roomId}/messages`);
  return extractArray<ChatMessage>(data);
}

export async function markRead(roomId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await mockDelay(undefined);
    return;
  }
  await apiClient.patch(`/chat/rooms/${roomId}/read`);
}
