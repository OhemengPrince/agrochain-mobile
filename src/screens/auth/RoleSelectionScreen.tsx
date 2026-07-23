import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList, UserRole } from '../../types';
import { googleRegister } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { ThemeColors } from '../../context/ThemeContext';
import ErrorMessage from '../../components/ErrorMessage';
import RolePicker from '../../components/RolePicker';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

const PLACEHOLDER_COLOR = '#9CA3AF';

export default function RoleSelectionScreen({ route }: Props) {
  const { idToken, email, fullName, profilePhotoUrl } = route.params;
  const { colors } = useTheme();
  const { login } = useAuth();
  const styles = createStyles(colors);

  const [role, setRole] = useState<UserRole>('FARMER');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await googleRegister({
        idToken,
        role,
        phoneNumber: phoneNumber.trim() || undefined,
        region: region.trim() || undefined,
        district: district.trim() || undefined,
        fallbackProfile: { email, fullName, profilePhotoUrl },
      });
      await login(token, user);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not complete sign-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.profileRow}>
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.email}>{email}</Text>
          </View>
        </View>

        <ErrorMessage message={error} />

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>I am a</Text>
          <View style={styles.sectionLabelLine} />
        </View>
        <RolePicker value={role} onChange={setRole} colors={colors} />

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>Location (optional)</Text>
          <View style={styles.sectionLabelLine} />
        </View>
        <View style={styles.row}>
          <View style={[styles.inputWrap, styles.half]}>
            <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              placeholder="Region"
              placeholderTextColor={PLACEHOLDER_COLOR}
            />
          </View>
          <View style={[styles.inputWrap, styles.half]}>
            <Ionicons name="map-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={district}
              onChangeText={setDistrict}
              placeholder="District"
              placeholderTextColor={PLACEHOLDER_COLOR}
            />
          </View>
        </View>

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabelText}>Phone number (optional)</Text>
          <View style={styles.sectionLabelLine} />
        </View>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={20} color={colors.primaryGreen} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="241234567"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonText}>{loading ? 'Finishing up...' : 'Continue'}</Text>
          {!loading && <Ionicons name="checkmark-circle" size={20} color={colors.white} />}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 24,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
    },
    avatarFallback: {
      backgroundColor: colors.primaryGreen,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.white,
    },
    name: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    email: {
      fontSize: 13,
      color: colors.secondaryText,
      marginTop: 2,
    },
    sectionLabelWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      marginTop: 8,
    },
    sectionLabelText: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.primaryGreen,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    sectionLabelLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.primaryGreen,
      opacity: 0.3,
      marginLeft: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    half: {
      flex: 1,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 56,
      paddingHorizontal: 14,
      marginBottom: 14,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      height: 58,
      borderRadius: 16,
      backgroundColor: colors.primaryGreen,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitButtonText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '700',
    },
  });
}
