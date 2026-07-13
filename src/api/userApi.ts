import apiClient, { extractArray } from './axios';
import { User, UserRole } from '../types';
import { USE_MOCK_DATA } from '../config';
import { MOCK_USERS, MOCK_EQUIPMENT } from '../mock/mockData';
import { mockDelay } from '../mock/mockHelpers';

export interface TopRatedUser {
  id: string;
  fullName: string;
  role: UserRole;
  region?: string;
  averageRating: number;
  totalReviews: number;
  profilePhotoUrl?: string;
  isVerified: boolean;
}

// Synthetic ratings for non-owner roles in mock mode (owners get ratings from equipment data)
const MOCK_SYNTHETIC_RATINGS: Record<string, { rating: number; reviews: number }> = {
  f1:  { rating: 4.5, reviews: 22 },
  f2:  { rating: 4.7, reviews: 15 },
  f3:  { rating: 4.2, reviews: 10 },
  f4:  { rating: 4.0, reviews: 5  },
  f5:  { rating: 3.8, reviews: 7  },
  by1: { rating: 4.3, reviews: 8  },
  by2: { rating: 3.9, reviews: 4  },
  g1:  { rating: 3.7, reviews: 3  },
};

export async function getRecentUsers(limit = 10): Promise<TopRatedUser[]> {
  if (USE_MOCK_DATA) {
    return mockDelay(
      MOCK_USERS.slice(0, limit).map((user) => ({
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        region: user.region,
        averageRating: 0,
        totalReviews: 0,
        profilePhotoUrl: user.profileImageUrl,
        isVerified: user.isVerified,
      }))
    );
  }

  try {
    const { data } = await apiClient.get<any>('/users/recent', { params: { limit } });
    return extractArray<TopRatedUser>(data).slice(0, limit);
  } catch {
    // /users/recent not available — derive unique owners from equipment listings
    const { data } = await apiClient.get<any>('/equipment', { params: { page: 0, size: 20 } });
    const equipment = extractArray<any>(data);
    const seen = new Set<string>();
    const users: TopRatedUser[] = [];
    for (const eq of equipment) {
      const ownerId = String(eq.ownerId ?? eq.owner?.id ?? '');
      if (!ownerId || seen.has(ownerId)) continue;
      seen.add(ownerId);
      users.push({
        id: ownerId,
        fullName: eq.ownerName ?? eq.owner?.fullName ?? 'Equipment Owner',
        role: 'EQUIPMENT_OWNER' as const,
        region: eq.location ?? eq.region,
        averageRating: 0,
        totalReviews: 0,
        profilePhotoUrl: eq.owner?.profileImageUrl,
        isVerified: false,
      });
      if (users.length >= limit) break;
    }
    return users;
  }
}

export async function getMe(): Promise<User | null> {
  if (USE_MOCK_DATA) return null;
  try {
    const { data } = await apiClient.get<User>('/users/me');
    return data ?? null;
  } catch {
    return null;
  }
}

export async function updatePhotoUrl(photoUrl: string): Promise<void> {
  if (USE_MOCK_DATA) return;
  await apiClient.put('/users/me/photo-url', { photoUrl });
}

export async function getTopRatedUsers(limit = 10): Promise<TopRatedUser[]> {
  if (USE_MOCK_DATA) {
    // Aggregate equipment ratings per owner
    const ownerMap = new Map<string, { ratings: number[]; reviews: number[] }>();
    for (const eq of MOCK_EQUIPMENT) {
      if (!eq.averageRating) continue;
      const entry = ownerMap.get(eq.ownerId) ?? { ratings: [], reviews: [] };
      entry.ratings.push(eq.averageRating);
      entry.reviews.push(eq.totalReviews ?? 0);
      ownerMap.set(eq.ownerId, entry);
    }

    const users: TopRatedUser[] = MOCK_USERS.flatMap((user) => {
      if (ownerMap.has(user.id)) {
        const d = ownerMap.get(user.id)!;
        const avg = d.ratings.reduce((s, r) => s + r, 0) / d.ratings.length;
        return [{
          id: user.id,
          fullName: user.fullName,
          role: user.role,
          region: user.region,
          averageRating: Math.round(avg * 10) / 10,
          totalReviews: d.reviews.reduce((s, r) => s + r, 0),
          profilePhotoUrl: user.profileImageUrl,
          isVerified: user.isVerified,
        }];
      }
      const syn = MOCK_SYNTHETIC_RATINGS[user.id];
      if (!syn) return [];
      return [{
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        region: user.region,
        averageRating: syn.rating,
        totalReviews: syn.reviews,
        profilePhotoUrl: user.profileImageUrl,
        isVerified: user.isVerified,
      }];
    });

    users.sort((a, b) => b.averageRating - a.averageRating);
    return mockDelay(users.slice(0, limit));
  }

  console.log('[API] GET /users/top-rated', { limit });
  const { data } = await apiClient.get<any>('/users/top-rated', { params: { limit } });
  const result = extractArray<TopRatedUser>(data);
  console.log('[API] /users/top-rated ->', result.length, 'users');
  return result.slice(0, limit);
}
