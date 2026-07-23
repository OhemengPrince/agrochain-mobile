import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  Platform,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import ReactionBar from './ReactionBar';
import { getComments } from '../api/itemCommentApi';
import * as commentSocket from '../services/itemCommentSocket';
import { ItemComment, ItemType } from '../types';

// Instagram-style palette for the sheet, swapped based on the app's own
// light/dark mode toggle rather than being hardcoded to one look.
const DARK_PALETTE = {
  sheetBg: '#151515',
  handle: '#3A3A3C',
  divider: '#262626',
  text: '#FFFFFF',
  secondaryText: '#8E8E93',
  inputBg: '#1F1F1F',
  primaryGreen: '#2E8B4A',
  heartRed: '#ED4956',
};

const LIGHT_PALETTE = {
  sheetBg: '#FFFFFF',
  handle: '#D1D5DB',
  divider: '#E5E7EB',
  text: '#111111',
  secondaryText: '#6B7280',
  inputBg: '#F1F2F4',
  primaryGreen: '#1A6B2E',
  heartRed: '#ED4956',
};

// Percentage heights inside a KeyboardAvoidingView with no explicit height of
// its own resolve unreliably (Yoga has no defined parent to compute against),
// which was leaving a large blank gap below the input row. Using a concrete
// pixel value computed from the window avoids that entirely.
const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.8);

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  itemType: ItemType;
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string;
  itemImageUrl?: string;
  itemEmoji?: string;
  onCommentsCountChange?: (count: number) => void;
}

interface CommentWithReplies extends ItemComment {
  replies: ItemComment[];
}

export default function CommentsSheet({
  visible,
  onClose,
  itemType,
  itemId,
  itemTitle,
  itemSubtitle,
  itemImageUrl,
  itemEmoji,
  onCommentsCountChange,
}: Props) {
  const { user, token } = useAuth();
  const { isDarkMode } = useTheme();
  const p = isDarkMode ? DARK_PALETTE : LIGHT_PALETTE;
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Tracked manually instead of relying on KeyboardAvoidingView, whose
  // automatic height/padding measurement is unreliable inside a Modal (it was
  // either shrinking the sheet to nothing or pushing content off the top of
  // the screen). Applying the measured height as padding ourselves is
  // predictable and keeps the header + comments list visible.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setLoadError(null);
    getComments(itemType, itemId)
      .then((data) => {
        setComments(data);
        onCommentsCountChange?.(data.length);
      })
      .catch((err) => {
        console.log('[CommentsSheet] getComments failed:', err?.message ?? err);
        setLoadError('Could not load comments. Check your connection and try again.');
      })
      .finally(() => setLoading(false));
  }, [visible, itemType, itemId]);

  // Live sync — any account viewing this item's comments sees new posts,
  // deletes, and reactions from every other account the moment they happen.
  useEffect(() => {
    if (!visible || !token) return;

    commentSocket.connect(token, itemType, itemId, {
      onNewComment: (comment) => {
        setComments((prev) => {
          const isMine = user != null && String(comment.authorId) === String(user.id);
          if (isMine) {
            const optIdx = prev.findIndex((c) => String(c.id).startsWith('opt-') && c.text === comment.text);
            if (optIdx !== -1) {
              const next = [...prev];
              next[optIdx] = comment;
              onCommentsCountChange?.(next.length);
              return next;
            }
          }
          if (prev.some((c) => String(c.id) === String(comment.id))) return prev;
          const next = [...prev, comment];
          onCommentsCountChange?.(next.length);
          return next;
        });
      },
      onCommentDeleted: (commentId) => {
        setComments((prev) => {
          const next = prev.filter((c) => String(c.id) !== commentId && String(c.parentId) !== commentId);
          onCommentsCountChange?.(next.length);
          return next;
        });
      },
      onCommentReaction: (commentId, reactions) => {
        setComments((prev) => prev.map((c) => (String(c.id) === commentId ? { ...c, reactions } : c)));
      },
    });

    return () => commentSocket.disconnect();
  }, [visible, token, itemType, itemId]);

  // Top-level comments with their replies nested underneath — replies don't
  // need their own scrollable list, they're just a handful of rows indented
  // under the parent.
  const threadedComments = useMemo<CommentWithReplies[]>(() => {
    const topLevel = comments.filter((c) => !c.parentId);
    return topLevel.map((c) => ({
      ...c,
      replies: comments.filter((r) => r.parentId === c.id),
    }));
  }, [comments]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;
    setSending(true);
    try {
      const optimistic: ItemComment = {
        id: `opt-${Date.now()}`,
        itemType,
        itemId,
        authorId: user.id,
        authorName: user.fullName,
        text: trimmed,
        parentId: replyingTo?.id,
        createdAt: new Date().toISOString(),
        reactions: [],
        myReaction: null,
      };
      setComments((prev) => {
        const next = [...prev, optimistic];
        onCommentsCountChange?.(next.length);
        return next;
      });
      commentSocket.postComment(itemType, itemId, trimmed, replyingTo?.id);
      setText('');
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const startReply = (comment: ItemComment) => {
    setReplyingTo({ id: comment.id, authorName: comment.authorName });
    setActiveCommentId(null);
    inputRef.current?.focus();
  };

  const handleDelete = (comment: ItemComment) => {
    setActiveCommentId(null);
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== comment.id && c.parentId !== comment.id);
      onCommentsCountChange?.(next.length);
      return next;
    });
    commentSocket.deleteComment(itemType, itemId, comment.id);
  };

  const handleReact = (comment: ItemComment, emoji: string) => {
    setActiveCommentId(null);
    commentSocket.reactToComment(itemType, itemId, comment.id, emoji);
  };

  const userInitial = (user?.fullName ?? 'Y').charAt(0).toUpperCase();

  function CommentRow({ item, isReply }: { item: ItemComment; isReply?: boolean }) {
    const isOwn = user != null && String(item.authorId) === String(user.id);
    const isActive = activeCommentId === item.id;
    return (
      <View style={{ marginBottom: 16, marginLeft: isReply ? 46 : 0, marginTop: isReply ? 12 : 0 }}>
        {isActive && (
          <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
            <ReactionBar
              isDarkMode={isDarkMode}
              onPick={(emoji) => handleReact(item, emoji)}
            />
          </View>
        )}
        <Pressable
          onLongPress={() => setActiveCommentId(item.id)}
          delayLongPress={350}
          style={{ flexDirection: 'row', gap: 12 }}
        >
          <View style={{ width: isReply ? 28 : 34, height: isReply ? 28 : 34, borderRadius: isReply ? 14 : 17, backgroundColor: p.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: isReply ? 11 : 13, fontWeight: '700' }}>{item.authorName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: p.text }}>
              <Text style={{ fontWeight: '700' }}>{item.authorName}</Text>
              <Text style={{ color: p.secondaryText }}>  {timeAgo(item.createdAt)}</Text>
            </Text>
            <Text style={{ fontSize: 14, color: p.text, marginTop: 4, lineHeight: 19 }}>{item.text}</Text>
            {item.reactions.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                {item.reactions.map((r) => (
                  <View key={r.emoji} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 13 }}>{r.emoji}</Text>
                    <Text style={{ fontSize: 11, color: p.secondaryText, fontWeight: '600' }}>{r.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Pressable>
        {isActive && (
          <View style={{
            marginTop: 8, marginLeft: isReply ? 40 : 46,
            backgroundColor: p.inputBg, borderRadius: 12, overflow: 'hidden', alignSelf: 'flex-start',
          }}>
            <Pressable onPress={() => startReply(item)} style={{ paddingVertical: 9, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, color: p.text, fontWeight: '600' }}>Reply</Text>
            </Pressable>
            {isOwn && (
              <Pressable onPress={() => handleDelete(item)} style={{ paddingVertical: 9, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: p.divider }}>
                <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: p.sheetBg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            height: SHEET_HEIGHT, paddingBottom: keyboardHeight,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: p.handle, alignSelf: 'center', marginTop: 10 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12 }}>
              <View style={{ width: 32 }} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: p.text }}>
                Comments
              </Text>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 32, alignItems: 'flex-end' }}>
                <Ionicons name="close" size={22} color={p.secondaryText} />
              </Pressable>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: p.divider,
            }}>
              {itemImageUrl ? (
                <Image source={{ uri: itemImageUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: p.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{itemEmoji ?? '📦'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: p.text }} numberOfLines={1}>{itemTitle}</Text>
                {itemSubtitle ? (
                  <Text style={{ fontSize: 11, color: p.secondaryText, marginTop: 2 }} numberOfLines={1}>{itemSubtitle}</Text>
                ) : null}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              {loading ? (
                <ActivityIndicator color={p.primaryGreen} style={{ marginVertical: 32 }} />
              ) : loadError ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                  <Ionicons name="cloud-offline-outline" size={36} color={p.secondaryText} />
                  <Text style={{ color: p.secondaryText, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    {loadError}
                  </Text>
                </View>
              ) : threadedComments.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                  <Ionicons name="chatbubble-outline" size={36} color={p.secondaryText} />
                  <Text style={{ color: p.secondaryText, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    No comments yet. Be the first to say something.
                  </Text>
                </View>
              ) : (
                <Pressable style={{ flex: 1 }} onPress={() => setActiveCommentId(null)}>
                  <FlatList
                    data={threadedComments}
                    keyExtractor={(c) => c.id}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    onScrollBeginDrag={() => setActiveCommentId(null)}
                    renderItem={({ item }) => (
                      <View>
                        <CommentRow item={item} />
                        {item.replies.map((reply) => (
                          <CommentRow key={reply.id} item={reply} isReply />
                        ))}
                      </View>
                    )}
                  />
                </Pressable>
              )}
            </View>

            {replyingTo && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingVertical: 8, backgroundColor: p.inputBg,
              }}>
                <Text style={{ fontSize: 12, color: p.secondaryText }}>
                  Replying to <Text style={{ fontWeight: '700', color: p.text }}>{replyingTo.authorName}</Text>
                </Text>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={p.secondaryText} />
                </Pressable>
              </View>
            )}

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 26 : 12,
              borderTopWidth: 1, borderTopColor: p.divider,
            }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{userInitial}</Text>
              </View>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                onFocus={() => setActiveCommentId(null)}
                placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Join the conversation...'}
                placeholderTextColor={p.secondaryText}
                style={{
                  flex: 1, backgroundColor: p.inputBg, borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: p.text,
                }}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                multiline
              />
              {text.trim().length > 0 ? (
                <Pressable onPress={handleSend} disabled={sending} hitSlop={8}>
                  {sending ? (
                    <ActivityIndicator size="small" color={p.primaryGreen} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: p.primaryGreen }}>Post</Text>
                  )}
                </Pressable>
              ) : (
                <>
                  <Pressable hitSlop={8}>
                    <Ionicons name="image-outline" size={22} color={p.secondaryText} />
                  </Pressable>
                  <View style={{
                    width: 34, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: p.secondaryText,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: p.secondaryText }}>GIF</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
