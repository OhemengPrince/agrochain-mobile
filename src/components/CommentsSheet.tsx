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
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { ThemeColors } from '../context/ThemeContext';
import { getItemComments, addItemComment, StoredComment } from '../utils/storage';

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
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
  const { colors } = useTheme();
  const { user } = useAuth();
  const [comments, setComments] = useState<StoredComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

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

  const userInitial = (user?.fullName ?? 'Y').charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 }} />

            {/* Item preview on top */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
            }}>
              {itemImageUrl ? (
                <Image source={{ uri: itemImageUrl }} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{itemEmoji ?? '📦'}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }} numberOfLines={1}>{itemTitle}</Text>
                {itemSubtitle ? (
                  <Text style={{ fontSize: 12, color: colors.secondaryText, marginTop: 2 }} numberOfLines={1}>{itemSubtitle}</Text>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, padding: 16, paddingBottom: 8 }}>
              Comments ({comments.length})
            </Text>

            {loading ? (
              <ActivityIndicator color={colors.primaryGreen} style={{ marginVertical: 32 }} />
            ) : comments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 }}>
                <Ionicons name="chatbubble-outline" size={36} color={colors.secondaryText} />
                <Text style={{ color: colors.secondaryText, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                  No comments yet. Be the first to say something.
                </Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.authorName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{item.authorName}</Text>
                        <Text style={{ fontSize: 11, color: colors.secondaryText }}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: colors.text, marginTop: 3, lineHeight: 18 }}>{item.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
              borderTopWidth: 1, borderTopColor: colors.divider,
            }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryGreen, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{userInitial}</Text>
              </View>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a comment..."
                placeholderTextColor={colors.secondaryText}
                style={{
                  flex: 1, backgroundColor: colors.inputBackground, borderRadius: 20,
                  paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: colors.text,
                }}
                multiline
              />
              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || sending}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: text.trim() ? colors.primaryGreen : colors.border,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
