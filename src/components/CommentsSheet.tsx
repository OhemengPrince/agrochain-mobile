import React, { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { getItemComments, addItemComment, StoredComment } from '../utils/storage';

// Dark Instagram-style palette — this sheet intentionally does not follow the
// app's light/dark theme; it always renders dark to match the reference UI.
const DARK = {
  sheetBg: '#151515',
  handle: '#3A3A3C',
  divider: '#262626',
  text: '#FFFFFF',
  secondaryText: '#8E8E93',
  inputBg: '#1F1F1F',
  primaryGreen: '#2E8B4A',
  heartRed: '#ED4956',
};

const QUICK_REACTIONS = ['🤣', '👀', '🔥', '👏', '😢', '😍', '😮', '😂'];

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
  const [comments, setComments] = useState<StoredComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [reactingCommentId, setReactingCommentId] = useState<string | null>(null);
  const [commentReactions, setCommentReactions] = useState<Record<string, string>>({});

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

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const authorName = user?.fullName ?? 'You';
      const comment = await addItemComment(itemId, authorName, trimmed);
      const next = [...comments, comment];
      setComments(next);
      onCommentsCountChange?.(next.length);
      setText('');
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

  const chooseReaction = (commentId: string, emoji: string) => {
    setCommentReactions((prev) => ({ ...prev, [commentId]: emoji }));
    setReactingCommentId(null);
  };

  const userInitial = (user?.fullName ?? 'Y').charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          style={{ backgroundColor: DARK.sheetBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ height: '80%', maxHeight: '80%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: DARK.handle, alignSelf: 'center', marginTop: 10 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 12 }}>
              <View style={{ width: 32 }} />
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: DARK.text }}>
                Comments
              </Text>
              <Pressable onPress={onClose} hitSlop={10} style={{ width: 32, alignItems: 'flex-end' }}>
                <Ionicons name="close" size={22} color={DARK.secondaryText} />
              </Pressable>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: DARK.divider,
            }}>
              {itemImageUrl ? (
                <Image source={{ uri: itemImageUrl }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: DARK.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{itemEmoji ?? '📦'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: DARK.text }} numberOfLines={1}>{itemTitle}</Text>
                {itemSubtitle ? (
                  <Text style={{ fontSize: 11, color: DARK.secondaryText, marginTop: 2 }} numberOfLines={1}>{itemSubtitle}</Text>
                ) : null}
              </View>
            </View>

            <View style={{ flex: 1 }}>
              {loading ? (
                <ActivityIndicator color={DARK.primaryGreen} style={{ marginVertical: 32 }} />
              ) : comments.length === 0 ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
                  <Ionicons name="chatbubble-outline" size={36} color={DARK.secondaryText} />
                  <Text style={{ color: DARK.secondaryText, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    No comments yet. Be the first to say something.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(c) => c.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}
                  renderItem={({ item }) => {
                    const liked = likedIds.has(item.id);
                    const reaction = commentReactions[item.id];
                    const isReacting = reactingCommentId === item.id;
                    return (
                      <Pressable
                        onLongPress={() => setReactingCommentId(item.id)}
                        delayLongPress={350}
                        style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}
                      >
                        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: DARK.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.authorName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: DARK.text }}>
                            <Text style={{ fontWeight: '700' }}>{item.authorName}</Text>
                            <Text style={{ color: DARK.secondaryText }}>  {timeAgo(item.createdAt)}</Text>
                          </Text>
                          <Text style={{ fontSize: 14, color: DARK.text, marginTop: 4, lineHeight: 19 }}>{item.text}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <Pressable hitSlop={8}>
                              <Text style={{ fontSize: 12, color: DARK.secondaryText, fontWeight: '600' }}>Reply</Text>
                            </Pressable>
                            {reaction ? <Text style={{ fontSize: 14 }}>{reaction}</Text> : null}
                          </View>
                          {isReacting && (
                            <View style={{
                              flexDirection: 'row', gap: 8, marginTop: 10,
                              backgroundColor: DARK.inputBg, borderRadius: 22,
                              paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
                            }}>
                              {QUICK_REACTIONS.map((emoji) => (
                                <Pressable key={emoji} onPress={() => chooseReaction(item.id, emoji)} hitSlop={4}>
                                  <Text style={{ fontSize: 18 }}>{emoji}</Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                        <Pressable onPress={() => toggleLike(item.id)} hitSlop={8} style={{ alignItems: 'center', paddingTop: 2 }}>
                          <Ionicons
                            name={liked ? 'heart' : 'heart-outline'}
                            size={15}
                            color={liked ? DARK.heartRed : DARK.secondaryText}
                          />
                          <Text style={{ fontSize: 11, color: DARK.secondaryText, marginTop: 3 }}>{liked ? 1 : ''}</Text>
                        </Pressable>
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 26 : 12,
              borderTopWidth: 1, borderTopColor: DARK.divider,
            }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: DARK.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{userInitial}</Text>
              </View>
              <TextInput
                value={text}
                onChangeText={setText}
                onFocus={() => setReactingCommentId(null)}
                placeholder="Join the conversation..."
                placeholderTextColor={DARK.secondaryText}
                style={{
                  flex: 1, backgroundColor: DARK.inputBg, borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: DARK.text,
                }}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                multiline
              />
              {text.trim().length > 0 ? (
                <Pressable onPress={handleSend} disabled={sending} hitSlop={8}>
                  {sending ? (
                    <ActivityIndicator size="small" color={DARK.primaryGreen} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: '700', color: DARK.primaryGreen }}>Post</Text>
                  )}
                </Pressable>
              ) : (
                <>
                  <Pressable hitSlop={8}>
                    <Ionicons name="image-outline" size={22} color={DARK.secondaryText} />
                  </Pressable>
                  <View style={{
                    width: 34, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: DARK.secondaryText,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: DARK.secondaryText }}>GIF</Text>
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
