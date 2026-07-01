import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  navigation: any;
  route: {
    params: {
      title: string;
      subtitle: string;
      district: string;
      region: string;
    };
  };
}

interface Coords {
  latitude: number;
  longitude: number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const DELTA = 0.08; // ~8 km viewport

export default function MapScreen({ navigation, route }: Props) {
  const { title, subtitle, district, region } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [pinCoords, setPinCoords] = useState<Coords | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Geocode district + region via Nominatim (no API key required)
  useEffect(() => {
    let cancelled = false;
    const geocode = async () => {
      try {
        const query = encodeURIComponent(`${district}, ${region}, Ghana`);
        const res = await fetch(
          `${NOMINATIM}?q=${query}&format=json&limit=1`,
          { headers: { 'User-Agent': 'AgroChain-Mobile/1.0' } }
        );
        const data = await res.json();
        if (cancelled) return;
        if (data && data.length > 0) {
          setPinCoords({
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          });
        } else {
          setError(`Could not find "${district}, ${region}" on the map.`);
        }
      } catch {
        if (!cancelled) setError('Map unavailable. Check your internet connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    geocode();
    return () => { cancelled = true; };
  }, [district, region]);

  // Request location permission and get user's GPS position
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        // silent — user location is optional
      }
    })();
  }, []);

  const flyToUser = useCallback(() => {
    if (!userCoords) {
      Alert.alert('Location', 'Your GPS location is not available yet.');
      return;
    }
    mapRef.current?.animateToRegion(
      { ...userCoords, latitudeDelta: DELTA, longitudeDelta: DELTA },
      600
    );
  }, [userCoords]);

  const flyToPin = useCallback(() => {
    if (!pinCoords) return;
    mapRef.current?.animateToRegion(
      { ...pinCoords, latitudeDelta: DELTA, longitudeDelta: DELTA },
      600
    );
  }, [pinCoords]);

  const initialRegion: Region | undefined = pinCoords
    ? { ...pinCoords, latitudeDelta: DELTA, longitudeDelta: DELTA }
    : undefined;

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={['#1A6B2E', '#2E8B4A']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.headerLocRow}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerSub} numberOfLines={1}>
              {district}, {region} Region
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Map or States */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={[styles.statusText, { color: colors.secondaryText }]}>
            Locating on map…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.errorText, { color: colors.secondaryText }]}>{error}</Text>
          <Pressable onPress={() => navigation.goBack()} style={[styles.retryBtn, { backgroundColor: colors.primaryGreen }]}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_DEFAULT}
            initialRegion={initialRegion}
            showsUserLocation={!!userCoords}
            showsMyLocationButton={false}
            showsCompass
            showsScale
          >
            {pinCoords && (
              <Marker
                coordinate={pinCoords}
                title={title}
                description={`${subtitle} · ${district}, ${region}`}
                pinColor="#1A6B2E"
              />
            )}
          </MapView>

          {/* FAB — fly to pin */}
          <View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
            {userCoords && (
              <Pressable style={[styles.fab, { backgroundColor: '#fff' }]} onPress={flyToUser}>
                <Ionicons name="navigate" size={20} color={colors.primaryGreen} />
              </Pressable>
            )}
            <Pressable style={[styles.fab, { backgroundColor: colors.primaryGreen }]} onPress={flyToPin}>
              <Ionicons name="location" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Location badge */}
          <View style={[styles.badge, { bottom: insets.bottom + 90 }]}>
            <Ionicons name="location" size={13} color={colors.primaryGreen} />
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {district}, {region} Region
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  statusText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  fabs: {
    position: 'absolute',
    right: 16,
    gap: 10,
    alignItems: 'center',
  },
  fab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    left: 16,
    right: 72,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: { fontSize: 13, fontWeight: '500', flex: 1 },
});
