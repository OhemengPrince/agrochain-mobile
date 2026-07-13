import React from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { User } from '../types';

interface Props {
  user: User | null;
  size?: number;
  style?: ViewStyle;
  uploading?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

export default function UserAvatar({
  user,
  size = 40,
  style,
  uploading = false,
  borderColor,
  borderWidth = 0,
}: Props) {
  const initial = user?.fullName?.charAt(0)?.toUpperCase() ?? '?';
  const hasPhoto = !!user?.profileImageUrl?.startsWith('http');
  const radius = size / 2;

  const circle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    ...(borderWidth > 0 ? { borderWidth, borderColor: borderColor ?? '#fff' } : {}),
  };

  return (
    <View style={[circle, style]}>
      {hasPhoto ? (
        <Image
          source={{ uri: user!.profileImageUrl! }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: '#1A6B2E', alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: '#fff' }}>{initial}</Text>
        </View>
      )}
      {uploading && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color="#fff" size={size > 60 ? 'large' : 'small'} />
        </View>
      )}
    </View>
  );
}
