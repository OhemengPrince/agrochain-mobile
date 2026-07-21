import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import GlassBlur from './GlassBlur';
import { getItemComments, addItemComment, StoredComment } from '../utils/storage';

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

const QUICK_REACTIONS: { emoji: string; label: string }[] = [
  { emoji: '🤣', label: 'Haha' },
  { emoji: '👀', label: 'Watching' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😍', label: 'Love' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😂', label: 'Funny' },
];

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
  itemId: string;
  itemTitle: string;
  itemSubtitle?: string;
  itemImageUrl?: string;
  itemEmoji?: string;
  onCommentsCountChange?: (count: number) => void;
}

interface CommentWithReplies extends StoredComment {
  replies: StoredComment[];
}

export default function CommentsSheet({
  visible,
  onClose,
  itemId,
  itemTitle,
  itemSubtitle,
  itemImageUrl,
  itemEmoji,
  onCommentsCountChange,
}: Props) {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const p = isDarkMode ? DARK_PALETTE : LIGHT_PALETTE;
  const [comments, setComments] = useState<StoredComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [reactingCommentId, setReactingCommentId] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, { emoji: string; label: string }>>({});
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getItemComments(itemId)
      .then((data) => {
        setComments(data);
        onCommentsCountChange?.(data.length);
      })
      .finally(() => setLoading(false));
  }, [visible, itemId]);

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

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const authorName = user?.fullName ?? 'You';
      const comment = await addItemComment(itemId, authorName, trimmed, replyingTo?.id);
      const next = [...comments, comment];
      setComments(next);
      onCommentsCountChange?.(next.length);
      setText('');
      setReplyingTo(null);
    } finally {
      setSending(false);
    }
  };

  const toggleLike = (commentId: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const chooseReaction = (commentId: string, reaction: { emoji: string; label: string }) => {
    setCommentReactions((prev) => ({ ...prev, [commentId]: reaction }));
    setReactingCommentId(null);
  };

  const startReply = (comment: StoredComment) => {
    setReplyingTo({ id: comment.id, authorName: comment.authorName });
    setReactingCommentId(null);
    inputRef.current?.focus();
  };

  const userInitial = (user?.fullName ?? 'Y').charAt(0).toUpperCase();

  function CommentRow({ item, isReply }: { item: StoredComment; isReply?: boolean }) {
    const liked = likedIds.has(item.id);
    const reaction = commentReactions[item.id];
    const isReacting = reactingCommentId === item.id;
    return (
      <Pressable
        onLongPress={() => setReactingCommentId(item.id)}
        delayLongPress={350}
        style={{ flexDirection: 'row', gap: 12, marginBottom: 16, marginLeft: isReply ? 46 : 0, marginTop: isReply ? 12 : 0 }}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Pressable hitSlop={8} onPress={() => startReply(item)}>
              <Text style={{ fontSize: 12, color: p.secondaryText, fontWeight: '600' }}>Reply</Text>
            </Pressable>
            {reaction ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 13 }}>{reaction.emoji}</Text>
                <Text style={{ fontSize: 11, color: p.secondaryText, fontWeight: '600' }}>{reaction.label}</Text>
              </View>
            ) : null}
          </View>
          {isReacting && (
            <View style={{
              flexDirection: 'row', gap: 10, marginTop: 10,
              backgroundColor: p.inputBg, borderRadius: 16,
              paddingHorizontal: 10, paddingVertical: 8, alignSelf: 'flex-start',
            }}>
              {QUICK_REACTIONS.map((reactionOption) => (
                <Pressable
                  key={reactionOption.emoji}
                  onPress={() => chooseReaction(item.id, reactionOption)}
                  hitSlop={4}
                  style={{ alignItems: 'center', width: 34 }}
                >
                  <Text style={{ fontSize: 18 }}>{reactionOption.emoji}</Text>
                  <Text style={{ fontSize: 9, color: p.secondaryText, marginTop: 2 }} numberOfLines={1}>{reactionOption.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <Pressable onPress={() => toggleLike(item.id)} hitSlop={8} style={{ alignItems: 'center', paddingTop: 2 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <GlassBlur
              intensity={35}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
              androidFallbackColor={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
            />
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={15}
              color={liked ? p.heartRed : p.secondaryText}
            />
          </View>
          <Text style={{ fontSize: 11, color: p.secondaryText, marginTop: 3 }}>{liked ? 1 : ''}</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          style={{ backgroundColor: p.sheetBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: SHEET_HEIGHT }}
          behavior={Platform.OS === 'ios' ? 'height' : undefined}
        >
          {/* behavior="height" (not "padding") shrinks this container's own
              height from the bottom when the keyboard opens, instead of
              adding bottom padding that grows its total size and pushes the
              top — with comments and the header — off the top of the screen. */}
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
              ) : threadedComments.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                  <Ionicons name="chatbubble-outline" size={36} color={p.secondaryText} />
                  <Text style={{ color: p.secondaryText, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    No comments yet. Be the first to say something.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={threadedComments}
                  keyExtractor={(c) => c.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  renderItem={({ item }) => (
                    <View>
                      <CommentRow item={item} />
                      {item.replies.map((reply) => (
                        <CommentRow key={reply.id} item={reply} isReply />
                      ))}
                    </View>
                  )}
                />
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
                onFocus={() => setReactingCommentId(null)}
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
