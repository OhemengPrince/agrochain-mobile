import apiClient, { extractArray } from './axios';
import { ItemComment, ItemType } from '../types';

export async function getComments(itemType: ItemType, itemId: string): Promise<ItemComment[]> {
  console.log('[itemCommentApi] GET /items/' + itemType + '/' + itemId + '/comments');
  const { data } = await apiClient.get<any>(`/items/${itemType}/${itemId}/comments`);
  const comments = extractArray<ItemComment>(data);
  console.log('[itemCommentApi] /comments ->', comments.length, 'comment(s)');
  return comments;
}

export async function postComment(
  itemType: ItemType,
  itemId: string,
  text: string,
  parentId?: string,
): Promise<ItemComment> {
  const { data } = await apiClient.post<ItemComment>(`/items/${itemType}/${itemId}/comments`, { text, parentId });
  return data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiClient.delete(`/items/comments/${commentId}`);
}

export async function reactToComment(commentId: string, emoji: string): Promise<ItemComment> {
  const { data } = await apiClient.post<ItemComment>(`/items/comments/${commentId}/react`, { emoji });
  return data;
}
