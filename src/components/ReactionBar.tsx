import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// WhatsApp-style quick-reaction set — matches the long-press reaction pill
// pattern used across chat messages and comments.
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '😡'];

interface Props {
  onPick: (emoji: string) => void;
  onMore?: () => void;
  isDarkMode: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ReactionBar({ onPick, onMore, isDarkMode, style }: Props) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: isDarkMode ? '#26262A' : '#FFFFFF' },
        style,
      ]}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable key={emoji} onPress={() => onPick(emoji)} hitSlop={6} style={styles.emojiBtn}>
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      ))}
      {onMore ? (
        <Pressable onPress={onMore} hitSlop={6} style={[styles.emojiBtn, styles.moreBtn, { backgroundColor: isDarkMode ? '#3A3A3E' : '#F1F2F4' }]}>
          <Ionicons name="add" size={18} color={isDarkMode ? '#fff' : '#111'} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  emojiBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  moreBtn: {
    borderRadius: 17,
    marginLeft: 2,
  },
});
