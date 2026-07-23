import { io, Socket } from 'socket.io-client';
import { ItemComment, ItemType, ReactionSummary } from '../types';
import { SOCKET_URL } from './chatSocket';

let socket: Socket | null = null;

export interface ItemCommentSocketHandlers {
  onNewComment: (comment: ItemComment) => void;
  onCommentDeleted: (commentId: string) => void;
  onCommentReaction: (commentId: string, reactions: ReactionSummary[]) => void;
  onConnect?: () => void;
  onError?: (error: unknown) => void;
}

export function connect(
  token: string,
  itemType: ItemType,
  itemId: string,
  handlers: ItemCommentSocketHandlers,
): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    auth: { token },
    query: { token },
    reconnection: true,
    reconnectionDelay: 3000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    socket?.emit('join_item', { itemType, itemId });
    handlers.onConnect?.();
  });

  socket.on('new_comment', (comment: ItemComment) => handlers.onNewComment(comment));
  socket.on('comment_deleted', (payload: { commentId: string }) => handlers.onCommentDeleted(String(payload.commentId)));
  socket.on('comment_reaction', (payload: { commentId: string; reactions: ReactionSummary[] }) =>
    handlers.onCommentReaction(String(payload.commentId), payload.reactions));

  socket.on('connect_error', (error: Error) => handlers.onError?.(error));
  socket.on('error', (error: unknown) => handlers.onError?.(error));
}

export function postComment(itemType: ItemType, itemId: string, text: string, parentId?: string): void {
  if (!socket) throw new Error('[SocketIO] No comment socket — call connect() first');
  socket.emit('new_comment', { itemType, itemId, text, parentId });
}

export function deleteComment(itemType: ItemType, itemId: string, commentId: string): void {
  if (!socket) throw new Error('[SocketIO] No comment socket — call connect() first');
  socket.emit('delete_comment', { itemType, itemId, commentId });
}

export function reactToComment(itemType: ItemType, itemId: string, commentId: string, emoji: string): void {
  if (!socket) throw new Error('[SocketIO] No comment socket — call connect() first');
  socket.emit('react_comment', { itemType, itemId, commentId, emoji });
}

export function disconnect(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
