import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, StyleSheet } from 'react-native';
import { followUser, unfollowUser } from '../api/followApi';
import { useAuth } from '../hooks/useAuth';

interface Props {
  userId: string;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ userId, initialIsFollowing = false, onFollowChange }: Props) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  if (currentUser?.id === userId) return null;

  const handlePress = useCallback(async () => {
    if (loading || isFollowing) return;
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
  }, [loading, isFollowing, userId, onFollowChange]);

  const handleLongPress = useCallback(() => {
    if (!isFollowing) return;
    Alert.alert('Unfollow', 'Unfollow this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: async () => {
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
        },
      },
    ]);
  }, [isFollowing, userId, onFollowChange]);

  return (
    <Pressable
      style={isFollowing ? s.filled : s.outline}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isFollowing ? '#fff' : '#1A6B2E'} />
      ) : (
        <Text style={isFollowing ? s.filledText : s.outlineText}>
          {isFollowing ? '✓ Following' : '+ Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
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
});
