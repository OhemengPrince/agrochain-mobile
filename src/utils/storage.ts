import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { USE_MOCK_DATA } from '../config';

const TOKEN_KEY = '@agrochain/token';
const USER_KEY = '@agrochain/user';
const THEME_KEY = '@agrochain/theme';

// Mock mode never touches the native AsyncStorage module — it keeps
// everything in a plain in-memory object for the lifetime of the app.
const memoryStore: Record<string, string> = {};

export async function saveToken(token: string): Promise<void> {
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

export async function clearAll(): Promise<void> {
  if (USE_MOCK_DATA) {
    delete memoryStore[TOKEN_KEY];
    delete memoryStore[USER_KEY];
    return;
  }
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
