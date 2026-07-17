import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, StyleSheet } from 'react-native';
import { followUser, unfollowUser } from '../api/followApi';
import { useAuth } from '../hooks/useAuth';

interface Props {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'onGreen';
}

export default function FollowButton({
  userId,
  initialIsFollowing = false,
  onFollowChange,
  variant = 'default',
}: Props) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  if (currentUser?.id === userId) return null;

  const doUnfollow = useCallback(async () => {
    setLoading(true);
    try {
      await unfollowUser(userId);
      setIsFollowing(false);
      onFollowChange?.(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId, onFollowChange]);

  const handlePress = useCallback(async () => {
    if (loading) return;

    if (isFollowing) {
      Alert.alert('Unfollow', 'Unfollow this user?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfollow', style: 'destructive', onPress: doUnfollow },
      ]);
      return;
    }

    setLoading(true);
    try {
      await followUser(userId);
      setIsFollowing(true);
      onFollowChange?.(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [loading, isFollowing, userId, onFollowChange, doUnfollow]);

  const onGreen = variant === 'onGreen';

  const containerStyle = isFollowing
    ? onGreen ? s.onGreenFollowing : s.filled
    : onGreen ? s.onGreenOutline : s.outline;

  const textStyle = isFollowing
    ? onGreen ? s.onGreenFollowingText : s.filledText
    : onGreen ? s.onGreenOutlineText : s.outlineText;

  const spinnerColor = isFollowing
    ? onGreen ? '#1A6B2E' : '#FFFFFF'
    : onGreen ? '#FFFFFF' : '#1A6B2E';

  return (
    <Pressable style={containerStyle} onPress={handlePress}>
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text style={textStyle}>
          {isFollowing ? 'Unfollow' : '+ Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  /* default variant — green on white card */
  outline: {
    borderWidth: 1.5,
    borderColor: '#1A6B2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  filled: {
    backgroundColor: '#1A6B2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  outlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A6B2E',
  },
  filledText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* onGreen variant — white on green header */
  onGreenOutline: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  onGreenFollowing: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  onGreenOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onGreenFollowingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A6B2E',
  },
});
