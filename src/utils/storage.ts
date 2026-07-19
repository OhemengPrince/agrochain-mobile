import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { USE_MOCK_DATA } from '../config';

const TOKEN_KEY = '@agrochain/token';
const USER_KEY = '@agrochain/user';
const THEME_KEY = '@agrochain/theme';
const ONBOARDING_KEY = '@agrochain/hasSeenOnboarding';
const DISMISSED_NOTIFS_KEY = '@agrochain/dismissed_notifications';
const HIDDEN_BOOKINGS_KEY = '@agrochain/hidden_bookings';
const HIDDEN_OWNER_BOOKINGS_KEY = '@agrochain/hidden_owner_bookings';
const LIKED_LISTINGS_KEY = '@agrochain/liked_listings';
const ITEM_COMMENTS_KEY = '@agrochain/item_comments';

export interface StoredComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
}

// Mock mode never touches the native AsyncStorage module — it keeps
// everything in a plain in-memory object for the lifetime of the app.
const memoryStore: Record<string, string> = {};

export async function saveToken(token: string): Promise<void> {
  console.log('[storage] saveToken → key:', TOKEN_KEY, '| length:', token.length, '| first20:', token.slice(0, 20));
  if (USE_MOCK_DATA) {
    memoryStore[TOKEN_KEY] = token;
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  if (USE_MOCK_DATA) {
    return memoryStore[TOKEN_KEY] ?? null;
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken(): Promise<void> {
  if (USE_MOCK_DATA) {
    delete memoryStore[TOKEN_KEY];
    return;
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUser(user: User): Promise<void> {
  console.log('[Storage] saveUser — profilePhotoUrl:', user?.profilePhotoUrl);
  if (USE_MOCK_DATA) {
    memoryStore[USER_KEY] = JSON.stringify(user);
    return;
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[USER_KEY];
    return raw ? (JSON.parse(raw) as User) : null;
  }
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function removeUser(): Promise<void> {
  if (USE_MOCK_DATA) {
    delete memoryStore[USER_KEY];
    return;
  }
  await AsyncStorage.removeItem(USER_KEY);
}

export async function saveTheme(theme: 'dark' | 'light'): Promise<void> {
  if (USE_MOCK_DATA) {
    memoryStore[THEME_KEY] = theme;
    return;
  }
  await AsyncStorage.setItem(THEME_KEY, theme);
}

export async function getTheme(): Promise<string | null> {
  if (USE_MOCK_DATA) {
    return memoryStore[THEME_KEY] ?? null;
  }
  return AsyncStorage.getItem(THEME_KEY);
}

export async function getHasSeenOnboarding(): Promise<boolean> {
  if (USE_MOCK_DATA) {
    return memoryStore[ONBOARDING_KEY] === 'true';
  }
  return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
}

export async function setHasSeenOnboarding(): Promise<void> {
  if (USE_MOCK_DATA) {
    memoryStore[ONBOARDING_KEY] = 'true';
    return;
  }
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function getDismissedNotificationIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[DISMISSED_NOTIFS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(DISMISSED_NOTIFS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addDismissedNotificationId(id: string): Promise<void> {
  const ids = await getDismissedNotificationIds();
  if (ids.includes(id)) return;
  const updated = JSON.stringify([...ids, id]);
  if (USE_MOCK_DATA) {
    memoryStore[DISMISSED_NOTIFS_KEY] = updated;
    return;
  }
  await AsyncStorage.setItem(DISMISSED_NOTIFS_KEY, updated);
}

export async function getHiddenBookingIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[HIDDEN_BOOKINGS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(HIDDEN_BOOKINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addHiddenBookingId(id: string): Promise<void> {
  const ids = await getHiddenBookingIds();
  if (ids.includes(id)) return;
  const updated = JSON.stringify([...ids, id]);
  if (USE_MOCK_DATA) {
    memoryStore[HIDDEN_BOOKINGS_KEY] = updated;
    return;
  }
  await AsyncStorage.setItem(HIDDEN_BOOKINGS_KEY, updated);
}

export async function getHiddenOwnerBookingIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[HIDDEN_OWNER_BOOKINGS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(HIDDEN_OWNER_BOOKINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addHiddenOwnerBookingId(id: string): Promise<void> {
  const ids = await getHiddenOwnerBookingIds();
  if (ids.includes(id)) return;
  const updated = JSON.stringify([...ids, id]);
  if (USE_MOCK_DATA) {
    memoryStore[HIDDEN_OWNER_BOOKINGS_KEY] = updated;
    return;
  }
  await AsyncStorage.setItem(HIDDEN_OWNER_BOOKINGS_KEY, updated);
}

export async function getLikedListingIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[LIKED_LISTINGS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(LIKED_LISTINGS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function setListingLiked(id: string, liked: boolean): Promise<void> {
  const ids = await getLikedListingIds();
  const updated = liked ? [...new Set([...ids, id])] : ids.filter((existing) => existing !== id);
  const json = JSON.stringify(updated);
  if (USE_MOCK_DATA) {
    memoryStore[LIKED_LISTINGS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(LIKED_LISTINGS_KEY, json);
}

async function getAllItemComments(): Promise<Record<string, StoredComment[]>> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[ITEM_COMMENTS_KEY];
    return raw ? JSON.parse(raw) : {};
  }
  const raw = await AsyncStorage.getItem(ITEM_COMMENTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveAllItemComments(all: Record<string, StoredComment[]>): Promise<void> {
  const json = JSON.stringify(all);
  if (USE_MOCK_DATA) {
    memoryStore[ITEM_COMMENTS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(ITEM_COMMENTS_KEY, json);
}

export async function getItemComments(itemId: string): Promise<StoredComment[]> {
  const all = await getAllItemComments();
  return all[itemId] ?? [];
}

export async function addItemComment(itemId: string, authorName: string, text: string): Promise<StoredComment> {
  const all = await getAllItemComments();
  const comment: StoredComment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorName,
    text,
    createdAt: new Date().toISOString(),
  };
  all[itemId] = [...(all[itemId] ?? []), comment];
  await saveAllItemComments(all);
  return comment;
}

export async function clearAll(): Promise<void> {
  console.log('[storage] clearAll → removing', TOKEN_KEY, 'and', USER_KEY, 'from AsyncStorage');
  if (USE_MOCK_DATA) {
    delete memoryStore[TOKEN_KEY];
    delete memoryStore[USER_KEY];
    return;
  }
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  console.log('[storage] clearAll ✓ — storage keys removed');
}
