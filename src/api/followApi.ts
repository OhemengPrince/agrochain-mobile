import apiClient, { extractArray } from './axios';

export interface FollowUser {
  id: string;
  fullName: string;
  role: string;
  region?: string;
  profilePhotoUrl?: string;
  isVerified?: boolean;
}

export const followUser = (userId: string) =>
  apiClient.post(`/users/${userId}/follow`);

export const unfollowUser = (userId: string) =>
  apiClient.delete(`/users/${userId}/follow`);

export const getFollowStatus = (userId: string) =>
  apiClient.get<{ following: boolean }>(`/users/${userId}/follow-status`);

export const getFollowCounts = (userId: string) =>
  apiClient.get<{ followerCount: number; followingCount: number }>(`/users/${userId}/follow-counts`);

export async function getFollowers(userId: string): Promise<FollowUser[]> {
  console.log('[API] GET /users/' + userId + '/followers');
  const { data } = await apiClient.get<any>(`/users/${userId}/followers`);
  const result = extractArray<FollowUser>(data);
  console.log('[API] /followers ->', result.length, 'items');
  return result;
}

export async function getFollowing(userId: string): Promise<FollowUser[]> {
  console.log('[API] GET /users/' + userId + '/following');
  const { data } = await apiClient.get<any>(`/users/${userId}/following`);
  const result = extractArray<FollowUser>(data);
  console.log('[API] /following ->', result.length, 'items');
  return result;
}
