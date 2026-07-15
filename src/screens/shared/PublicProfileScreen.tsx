import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import { User, Equipment, ProduceBatch } from '../../types';
import { getPublicProfile } from '../../api/userApi';
import { searchEquipment } from '../../api/equipmentApi';
import { cardShadow } from '../../constants/shadows';
import UserAvatar from '../../components/UserAvatar';
import EquipmentImage from '../../components/EquipmentImage';
import { formatCurrency, getCropEmoji } from '../../utils/formatters';

const ROLE_LABELS: Record<string, string> = {
  FARMER: 'Farmer',
  EQUIPMENT_OWNER: 'Equipment Owner',
  BUYER: 'Buyer',
  GENERAL: 'General User',
  ADMIN: 'Administrator',
};

const ROLE_SPECIALTIES: Record<string, string[]> = {
  FARMER: ['Crop Cultivation', 'Harvest Management', 'Produce Traceability', 'Agricultural Inputs'],
  EQUIPMENT_OWNER: ['Equipment Rental', 'Fleet Management', 'Booking Management', 'Maintenance'],
  BUYER: ['Produce Sourcing', 'Quality Verification', 'QR Scanning', 'Bulk Purchasing'],
  GENERAL: ['Marketplace Trading', 'Price Monitoring', 'Equipment Browsing', 'Listings'],
};

const ROLE_BIO: Record<string, (name: string, location: string) => string> = {
  FARMER: (name, loc) => `${name} is a verified farmer based in ${loc}, using AgroChain to manage crops, log harvests, and sell produce to buyers across Ghana.`,
  EQUIPMENT_OWNER: (name, loc) => `${name} is an equipment owner based in ${loc}, offering agricultural machinery for rent to farmers through AgroChain.`,
  BUYER: (name, loc) => `${name} is a verified buyer based in ${loc}, sourcing quality produce directly from verified Ghanaian farmers.`,
  GENERAL: (name, loc) => `${name} is an AgroChain community member based in ${loc}, exploring the platform for agricultural opportunities.`,
};

export default function PublicProfileScreen({ navigation, route }: { navigation: any; route: any }) {
  const { userId } = route.params as { userId: string };
  const { colors } = useTheme();
  const s = createStyles(colors);

  const [profile, setProfile] = useState<User | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [profileRes] = await Promise.allSettled([getPublicProfile(userId)]);
        const p = profileRes.status === 'fulfilled' ? profileRes.value : null;
        setProfile(p);

        if (p?.role === 'EQUIPMENT_OWNER') {
          try {
            const eq = await searchEquipment({});
            setEquipment(eq.filter((e) => e.ownerId === userId).slice(0, 4));
          } catch {
            // not critical
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.loadingWrap}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <ActivityIndicator color={colors.primaryGreen} size="large" style={{ marginTop: 60 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.loadingWrap}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={s.notFound}>
            <Ionicons name="person-outline" size={56} color={colors.border} />
            <Text style={s.notFoundText}>Profile not found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const location = [profile.district, profile.region].filter(Boolean).join(', ') || 'Ghana';
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;
  const specialties = ROLE_SPECIALTIES[profile.role] ?? [];
  const bio = (ROLE_BIO[profile.role] ?? (() => ''))(profile.fullName.split(' ')[0], location);
  const memberSince = new Date(profile.createdAt).getFullYear();

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header gradient */}
        <LinearGradient colors={['#1A6B2E', '#2E8B4A']} style={s.header}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={s.avatarWrap}>
            <UserAvatar user={profile} size={82} />
            {profile.isVerified && (
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#1A6B2E" />
              </View>
            )}
          </View>

          <Text style={s.name}>{profile.fullName}</Text>

          <View style={s.rolePill}>
            <Text style={s.rolePillText}>{roleLabel}</Text>
          </View>

          {location && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={s.locationText}> {location}</Text>
            </View>
          )}

          <Text style={s.memberText}>Member since {memberSince}</Text>
        </LinearGradient>


        {/* About */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="person-outline" size={16} color={colors.primaryGreen} />
            <Text style={s.cardTitle}>About</Text>
          </View>
          <Text style={s.bioText}>{bio}</Text>
        </View>

        {/* Specialties */}
        {specialties.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="star-outline" size={16} color={colors.primaryGreen} />
              <Text style={s.cardTitle}>Specialties</Text>
            </View>
            <View style={s.specialtyGrid}>
              {specialties.map((sp) => (
                <View key={sp} style={s.specialtyChip}>
                  <Ionicons name="checkmark" size={12} color={colors.primaryGreen} />
                  <Text style={s.specialtyText}>{sp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Account info */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primaryGreen} />
            <Text style={s.cardTitle}>Account Info</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Account Type</Text>
            <Text style={s.infoValue}>{roleLabel}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Region</Text>
            <Text style={s.infoValue}>{profile.region ?? '—'}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>District</Text>
            <Text style={s.infoValue}>{profile.district ?? '—'}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Verified</Text>
            <View style={s.verifiedRow}>
              <Ionicons
                name={profile.isVerified ? 'checkmark-circle' : 'close-circle'}
                size={15}
                color={profile.isVerified ? colors.primaryGreen : colors.secondaryText}
              />
              <Text style={[s.infoValue, { color: profile.isVerified ? colors.primaryGreen : colors.secondaryText }]}>
                {profile.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Member Since</Text>
            <Text style={s.infoValue}>{memberSince}</Text>
          </View>
        </View>

        {/* Equipment listings for owners */}
        {profile.role === 'EQUIPMENT_OWNER' && equipment.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="construct-outline" size={16} color={colors.primaryGreen} />
              <Text style={s.cardTitle}>Listed Equipment</Text>
            </View>
            {equipment.map((item) => (
              <Pressable
                key={item.id}
                style={s.equipRow}
                onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
              >
                <EquipmentImage category={item.category} imageUrl={item.imageUrl} style={s.equipThumb} resizeMode="cover" />
                <View style={s.equipBody}>
                  <Text style={s.equipName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.equipPrice}>{formatCurrency(item.dailyRate)}/day</Text>
                  <Text style={s.equipLocation} numberOfLines={1}>{item.district}, {item.region}</Text>
                </View>
                <View style={[s.availDot, { backgroundColor: item.isAvailable ? colors.primaryGreen : '#EF4444' }]} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingWrap: {
      flex: 1,
    },
    header: {
      paddingTop: 56,
      paddingBottom: 28,
      alignItems: 'center',
      paddingHorizontal: 20,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    backBtn: {
      position: 'absolute',
      top: 56,
      left: 16,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: 12,
      marginTop: 8,
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#fff',
      borderRadius: 10,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'center',
    },
    rolePill: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 5,
      marginTop: 8,
    },
    rolePillText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    locationText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
    },
    memberText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.65)',
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      marginHorizontal: 16,
      marginTop: 14,
      padding: 16,
      ...cardShadow,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    bioText: {
      fontSize: 14,
      color: colors.secondaryText,
      lineHeight: 22,
    },
    specialtyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    specialtyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.lightGreen ?? 'rgba(26,107,46,0.08)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    specialtyText: {
      fontSize: 13,
      color: colors.primaryGreen,
      fontWeight: '600',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 13,
      color: colors.secondaryText,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    verifiedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 80,
    },
    notFoundText: {
      fontSize: 16,
      color: colors.secondaryText,
    },
    equipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    equipThumb: {
      width: 56,
      height: 56,
      borderRadius: 10,
    },
    equipBody: {
      flex: 1,
      gap: 2,
    },
    equipName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    equipPrice: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primaryGreen,
    },
    equipLocation: {
      fontSize: 12,
      color: colors.secondaryText,
    },
    availDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}
