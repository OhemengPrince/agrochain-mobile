import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { getFollowers, getFollowing, FollowUser } from '../../api/followApi';
import UserAvatar from '../../components/UserAvatar';
import FollowButton from '../../components/FollowButton';

const ROLE_LABELS: Record<string, string> = {
  FARMER: 'Farmer',
  EQUIPMENT_OWNER: 'Equipment Owner',
  BUYER: 'Buyer',
  GENERAL: 'General User',
  ADMIN: 'Administrator',
};

export default function FollowListScreen({ navigation, route }: { navigation: any; route: any }) {
  const { userId, type, userName } = route.params as {
    userId: string;
    type: 'followers' | 'following';
    userName: string;
  };
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = type === 'followers'
          ? await getFollowers(userId)
          : await getFollowing(userId);
        setUsers(data);
      } catch (err: any) {
        console.log('[FollowList] fetch FAILED:', err?.message ?? err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, type]);

  const title = type === 'followers' ? `${userName}'s Followers` : `${userName}'s Following`;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={colors.primaryGreen} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={users.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={colors.border} />
              <Text style={styles.emptyText}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={styles.rowLeft}
                onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
              >
                <UserAvatar user={item as any} size={46} />
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{ROLE_LABELS[item.role] ?? item.role}</Text>
                  </View>
                  {!!item.region && <Text style={styles.region}>{item.region}</Text>}
                </View>
              </Pressable>
              <FollowButton userId={item.id} />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 56,
      paddingBottom: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    roleBadge: {
      backgroundColor: colors.lightGreen ?? 'rgba(26,107,46,0.08)',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    region: {
      fontSize: 11,
      color: colors.secondaryText,
    },
    emptyContainer: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 80,
    },
    emptyText: {
      fontSize: 16,
      color: colors.secondaryText,
    },
  });
}
