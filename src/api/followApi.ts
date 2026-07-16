import apiClient from './axios';

export const followUser = (userId: string) =>
  apiClient.post(`/users/${userId}/follow`);

export const unfollowUser = (userId: string) =>
  apiClient.delete(`/users/${userId}/follow`);

export const getFollowStatus = (userId: string) =>
  apiClient.get<{ following: boolean }>(`/users/${userId}/follow-status`);

export const getFollowCounts = (userId: string) =>
  apiClient.get<{ followerCount: number; followingCount: number }>(`/users/${userId}/follow-counts`);

export const getFollowers = (userId: string) =>
  apiClient.get(`/users/${userId}/followers`);

export const getFollowing = (userId: string) =>
  apiClient.get(`/users/${userId}/following`);
