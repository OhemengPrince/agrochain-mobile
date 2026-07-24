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
const VIEWED_LISTING_SNAPSHOTS_KEY = '@agrochain/viewed_listing_snapshots';
const CHAT_CLEARED_AT_KEY = '@agrochain/chat_cleared_at';
const PINNED_ROOMS_KEY = '@agrochain/pinned_rooms';
const HIDDEN_ROOMS_AT_KEY = '@agrochain/hidden_rooms_at';
const BLOCKED_CONTACTS_KEY = '@agrochain/blocked_contacts';
const REPORTED_CONTACTS_KEY = '@agrochain/reported_contacts';
const CHAT_WALLPAPER_KEY = '@agrochain/chat_wallpaper';
const CHAT_BUBBLE_THEME_KEY = '@agrochain/chat_bubble_theme';
const CERTIFICATIONS_KEY = '@agrochain/certifications';
const APP_RATING_KEY = '@agrochain/app_rating';
const EXPORT_PREFERENCES_KEY = '@agrochain/export_preferences';

export type ExportDateRange = 'ALL' | '30D' | '90D';

export interface ExportPreferences {
  includePrices: boolean;
  includeDates: boolean;
  dateRange: ExportDateRange;
}

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = {
  includePrices: true,
  includeDates: true,
  dateRange: 'ALL',
};

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

// The backend increments viewsCount on every GET of a listing rather than
// tracking unique viewers, so re-opening the same listing repeatedly from
// this device would otherwise inflate the count each time. We pin the count
// to whatever it was the first time this device opened a given listing, so
// this account's own repeat views don't visibly re-count. This does not
// reflect new views from other real users after the first open — a true
// fix requires the backend to track unique viewer IDs instead of a raw
// per-request counter.
async function getViewedListingSnapshots(): Promise<Record<string, number>> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[VIEWED_LISTING_SNAPSHOTS_KEY];
    return raw ? JSON.parse(raw) : {};
  }
  const raw = await AsyncStorage.getItem(VIEWED_LISTING_SNAPSHOTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getPinnedListingViewCount(listingId: string, freshCount: number): Promise<number> {
  const snapshots = await getViewedListingSnapshots();
  if (typeof snapshots[listingId] === 'number') {
    return snapshots[listingId];
  }
  const updated = { ...snapshots, [listingId]: freshCount };
  const json = JSON.stringify(updated);
  if (USE_MOCK_DATA) {
    memoryStore[VIEWED_LISTING_SNAPSHOTS_KEY] = json;
  } else {
    await AsyncStorage.setItem(VIEWED_LISTING_SNAPSHOTS_KEY, json);
  }
  return freshCount;
}

// "Clear Chat" has no backend delete endpoint — the server still has every
// message. We persist, per room, the timestamp the user cleared up to, and
// filter out anything older than that whenever history reloads, so a
// cleared chat stays cleared after closing and reopening it instead of the
// full history silently coming back.
async function getAllChatClearedAt(): Promise<Record<string, string>> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[CHAT_CLEARED_AT_KEY];
    return raw ? JSON.parse(raw) : {};
  }
  const raw = await AsyncStorage.getItem(CHAT_CLEARED_AT_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getChatClearedAt(roomId: string): Promise<string | null> {
  const all = await getAllChatClearedAt();
  return all[roomId] ?? null;
}

export async function setChatClearedAt(roomId: string, isoTimestamp: string): Promise<void> {
  const all = await getAllChatClearedAt();
  all[roomId] = isoTimestamp;
  const json = JSON.stringify(all);
  if (USE_MOCK_DATA) {
    memoryStore[CHAT_CLEARED_AT_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(CHAT_CLEARED_AT_KEY, json);
}

// ── Pinned chat rooms ──────────────────────────────────────────────────
export async function getPinnedRoomIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[PINNED_ROOMS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(PINNED_ROOMS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function setRoomPinned(roomId: string, pinned: boolean): Promise<void> {
  const ids = await getPinnedRoomIds();
  const updated = pinned ? [...new Set([...ids, roomId])] : ids.filter((id) => id !== roomId);
  const json = JSON.stringify(updated);
  if (USE_MOCK_DATA) {
    memoryStore[PINNED_ROOMS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(PINNED_ROOMS_KEY, json);
}

// ── Hidden (locally "deleted") chat rooms ──────────────────────────────
// There's no backend endpoint to delete a conversation, so we hide it on
// this device from the timestamp it was deleted. If a NEW message arrives
// later (lastMessageAt newer than the hide time), the room reappears
// automatically — "deleted" until the account is texted again.
async function getAllHiddenRoomsAt(): Promise<Record<string, string>> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[HIDDEN_ROOMS_AT_KEY];
    return raw ? JSON.parse(raw) : {};
  }
  const raw = await AsyncStorage.getItem(HIDDEN_ROOMS_AT_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getHiddenRoomsAt(): Promise<Record<string, string>> {
  return getAllHiddenRoomsAt();
}

export async function hideRoom(roomId: string, isoTimestamp: string): Promise<void> {
  const all = await getAllHiddenRoomsAt();
  all[roomId] = isoTimestamp;
  const json = JSON.stringify(all);
  if (USE_MOCK_DATA) {
    memoryStore[HIDDEN_ROOMS_AT_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(HIDDEN_ROOMS_AT_KEY, json);
}

// ── Blocked contacts ────────────────────────────────────────────────────
export async function getBlockedContactIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[BLOCKED_CONTACTS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(BLOCKED_CONTACTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function setContactBlocked(userId: string, blocked: boolean): Promise<void> {
  const ids = await getBlockedContactIds();
  const updated = blocked ? [...new Set([...ids, userId])] : ids.filter((id) => id !== userId);
  const json = JSON.stringify(updated);
  if (USE_MOCK_DATA) {
    memoryStore[BLOCKED_CONTACTS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(BLOCKED_CONTACTS_KEY, json);
}

// ── Reported contacts (local-only ack — no backend endpoint exists) ────
export async function getReportedContactIds(): Promise<string[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[REPORTED_CONTACTS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(REPORTED_CONTACTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addReportedContactId(userId: string): Promise<void> {
  const ids = await getReportedContactIds();
  if (ids.includes(userId)) return;
  const json = JSON.stringify([...ids, userId]);
  if (USE_MOCK_DATA) {
    memoryStore[REPORTED_CONTACTS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(REPORTED_CONTACTS_KEY, json);
}

// ── Chat wallpaper + bubble color theme (device-wide, applies to all chats) ──
export async function getChatWallpaper(): Promise<string | null> {
  if (USE_MOCK_DATA) return memoryStore[CHAT_WALLPAPER_KEY] ?? null;
  return AsyncStorage.getItem(CHAT_WALLPAPER_KEY);
}

export async function setChatWallpaper(uri: string | null): Promise<void> {
  if (USE_MOCK_DATA) {
    if (uri) memoryStore[CHAT_WALLPAPER_KEY] = uri;
    else delete memoryStore[CHAT_WALLPAPER_KEY];
    return;
  }
  if (uri) await AsyncStorage.setItem(CHAT_WALLPAPER_KEY, uri);
  else await AsyncStorage.removeItem(CHAT_WALLPAPER_KEY);
}

export async function getChatBubbleTheme(): Promise<string | null> {
  if (USE_MOCK_DATA) return memoryStore[CHAT_BUBBLE_THEME_KEY] ?? null;
  return AsyncStorage.getItem(CHAT_BUBBLE_THEME_KEY);
}

export async function setChatBubbleTheme(themeKey: string): Promise<void> {
  if (USE_MOCK_DATA) {
    memoryStore[CHAT_BUBBLE_THEME_KEY] = themeKey;
    return;
  }
  await AsyncStorage.setItem(CHAT_BUBBLE_THEME_KEY, themeKey);
}

export async function getExportPreferences(): Promise<ExportPreferences> {
  const raw = USE_MOCK_DATA
    ? memoryStore[EXPORT_PREFERENCES_KEY]
    : await AsyncStorage.getItem(EXPORT_PREFERENCES_KEY);
  if (!raw) return DEFAULT_EXPORT_PREFERENCES;
  try {
    return { ...DEFAULT_EXPORT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EXPORT_PREFERENCES;
  }
}

export async function setExportPreferences(prefs: ExportPreferences): Promise<void> {
  const json = JSON.stringify(prefs);
  if (USE_MOCK_DATA) {
    memoryStore[EXPORT_PREFERENCES_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(EXPORT_PREFERENCES_KEY, json);
}

// ── Certifications — device-local; no backend endpoint exists for these ──
export interface StoredCertification {
  id: string;
  name: string;
  issuer?: string;
  photoUri?: string;
  addedAt: string;
}

export async function getCertifications(): Promise<StoredCertification[]> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[CERTIFICATIONS_KEY];
    return raw ? JSON.parse(raw) : [];
  }
  const raw = await AsyncStorage.getItem(CERTIFICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addCertification(cert: Omit<StoredCertification, 'id' | 'addedAt'>): Promise<StoredCertification> {
  const all = await getCertifications();
  const created: StoredCertification = {
    ...cert,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: new Date().toISOString(),
  };
  const updated = [...all, created];
  const json = JSON.stringify(updated);
  if (USE_MOCK_DATA) {
    memoryStore[CERTIFICATIONS_KEY] = json;
  } else {
    await AsyncStorage.setItem(CERTIFICATIONS_KEY, json);
  }
  return created;
}

export async function removeCertification(id: string): Promise<void> {
  const all = await getCertifications();
  const json = JSON.stringify(all.filter((c) => c.id !== id));
  if (USE_MOCK_DATA) {
    memoryStore[CERTIFICATIONS_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(CERTIFICATIONS_KEY, json);
}

// ── In-app "Rate the App" feedback — device-local; no store listing or
// backend endpoint exists yet to send this to ──────────────────────────
export interface StoredAppRating {
  stars: number;
  feedback?: string;
  submittedAt: string;
}

export async function getAppRating(): Promise<StoredAppRating | null> {
  if (USE_MOCK_DATA) {
    const raw = memoryStore[APP_RATING_KEY];
    return raw ? JSON.parse(raw) : null;
  }
  const raw = await AsyncStorage.getItem(APP_RATING_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setAppRating(rating: StoredAppRating): Promise<void> {
  const json = JSON.stringify(rating);
  if (USE_MOCK_DATA) {
    memoryStore[APP_RATING_KEY] = json;
    return;
  }
  await AsyncStorage.setItem(APP_RATING_KEY, json);
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
