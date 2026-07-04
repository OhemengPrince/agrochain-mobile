import apiClient, { extractArray } from './axios';
import { AppNotification } from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_NOTIFICATIONS } from '../mock/mockData';
import { mockDelay } from '../mock/mockHelpers';

export async function getNotifications(): Promise<AppNotification[]> {
  if (USE_MOCK_DATA) {
    return mockDelay([...MOCK_NOTIFICATIONS]);
  }
  const { data } = await apiClient.get<any>('/notifications');
  return extractArray<AppNotification>(data);
}

export async function markAsRead(notificationId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    const index = MOCK_NOTIFICATIONS.findIndex((n) => n.id === notificationId);
    if (index !== -1) MOCK_NOTIFICATIONS[index] = { ...MOCK_NOTIFICATIONS[index], isRead: true };
    await mockDelay(undefined);
    return;
  }
  await apiClient.patch(`/notifications/${notificationId}/read`);
}

export async function markAllRead(): Promise<void> {
  if (USE_MOCK_DATA) {
    for (let i = 0; i < MOCK_NOTIFICATIONS.length; i += 1) {
      MOCK_NOTIFICATIONS[i] = { ...MOCK_NOTIFICATIONS[i], isRead: true };
    }
    await mockDelay(undefined);
    return;
  }
  await apiClient.patch('/notifications/read-all');
}
