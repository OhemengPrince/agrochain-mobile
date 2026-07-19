import React, { useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  viewsCount?: number;
  liked: boolean;
  onToggleLike: () => void;
  commentsCount: number;
  onPressComment: () => void;
}

export default function PostEngagementBar({ viewsCount, liked, onToggleLike, commentsCount, onPressComment }: Props) {
  const { colors } = useTheme();
  const bounce = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Animated.sequence([
      Animated.spring(bounce, { toValue: 1.3, useNativeDriver: true, speed: 30, bounciness: 14 }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
    onToggleLike();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      {viewsCount !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="eye-outline" size={17} color={colors.secondaryText} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryText }}>{viewsCount}</Text>
        </View>
      )}
      <Pressable onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} hitSlop={8}>
        <Animated.View style={{ transform: [{ scale: bounce }] }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#DC2626' : colors.secondaryText} />
        </Animated.View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: liked ? '#DC2626' : colors.secondaryText }}>
          {liked ? 'Liked' : 'Like'}
        </Text>
      </Pressable>
      <Pressable onPress={onPressComment} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} hitSlop={8}>
        <Ionicons name="chatbubble-outline" size={16} color={colors.secondaryText} />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.secondaryText }}>{commentsCount}</Text>
      </Pressable>
    </View>
  );
}
