import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
const DELTA_USER = 0.012; // ~1.2 km — tight zoom when following
const DELTA_PIN  = 0.08;  // ~8 km  — wider view for equipment pin

export default function MapScreen({ navigation, route }: Props) {
  const { title, subtitle, district, region } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [pinCoords, setPinCoords] = useState<Coords | null>(null);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);

  // Refs so the watchPosition callback always sees current values without stale closure
  const isFollowingRef = useRef(true);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const firstFixDone = useRef(false);

  // ── Live GPS tracking ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,     // update at most every second
          distanceInterval: 3,    // or every 3 metres of movement
        },
        (pos) => {
          if (cancelled) return;
          const coords: Coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserCoords(coords);

          if (!firstFixDone.current) {
            // First fix → immediately fly to user with close zoom
            firstFixDone.current = true;
            mapRef.current?.animateToRegion(
              { ...coords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER },
              800
            );
          } else if (isFollowingRef.current) {
            // Subsequent fixes → smoothly pan to keep user centred
            mapRef.current?.animateToRegion(
              { ...coords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER },
              500
            );
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
    };
  }, []);

  // ── Geocode equipment location for the pin marker ─────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const query = encodeURIComponent(`${district}, ${region}, Ghana`);
        const res = await fetch(`${NOMINATIM}?q=${query}&format=json&limit=1`, {
          headers: { 'User-Agent': 'AgroChain-Mobile/1.0' },
        });
        const data = await res.json();
        if (cancelled) return;
        if (data && data.length > 0) {
          setPinCoords({
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          });
        } else {
          setGeoError(`Could not locate "${district}, ${region}" on the map.`);
        }
      } catch {
        if (!cancelled) setGeoError('Map unavailable. Check your internet connection.');
      }
    })();

    return () => { cancelled = true; };
  }, [district, region]);

  // ── Helpers ───────────────────────────────────────────────
  const updateFollowing = useCallback((val: boolean) => {
    isFollowingRef.current = val;
    setIsFollowing(val);
  }, []);

  // Navigate FAB: re-enable following and snap back to user
  const flyToUser = useCallback(() => {
    if (!userCoords) {
      Alert.alert('Location', 'Still acquiring your GPS position…');
      return;
    }
    updateFollowing(true);
    mapRef.current?.animateToRegion(
      { ...userCoords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER },
      600
    );
  }, [userCoords, updateFollowing]);

  // Pin FAB: stop following and show equipment location
  const flyToPin = useCallback(() => {
    if (!pinCoords) return;
    updateFollowing(false);
    mapRef.current?.animateToRegion(
      { ...pinCoords, latitudeDelta: DELTA_PIN, longitudeDelta: DELTA_PIN },
      600
    );
  }, [pinCoords, updateFollowing]);

  // Display states
  const loading = !pinCoords && !userCoords;
  const showError = !!geoError && !pinCoords && !userCoords;

  // initialRegion: prefer user location so map opens on you, not the pin
  const initialRegion: Region | undefined = userCoords
    ? { ...userCoords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER }
    : pinCoords
    ? { ...pinCoords, latitudeDelta: DELTA_PIN, longitudeDelta: DELTA_PIN }
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
        {/* Live indicator pill — shows when we have GPS */}
        {userCoords && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={[styles.statusText, { color: colors.secondaryText }]}>
            Getting your location…
          </Text>
        </View>
      ) : showError ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color={colors.secondaryText} />
          <Text style={[styles.errorText, { color: colors.secondaryText }]}>{geoError}</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.retryBtn, { backgroundColor: colors.primaryGreen }]}
          >
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
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass
            showsScale
            onPanDrag={() => updateFollowing(false)}
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

          {/* FABs — right side */}
          <View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
            {/* Navigate / follow-me FAB — filled green when following, white when not */}
            <Pressable
              style={[
                styles.fab,
                { backgroundColor: isFollowing ? colors.primaryGreen : '#fff' },
              ]}
              onPress={flyToUser}
            >
              <Ionicons
                name={isFollowing ? 'navigate' : 'navigate-outline'}
                size={20}
                color={isFollowing ? '#fff' : colors.primaryGreen}
              />
            </Pressable>

            {/* Fly-to-pin FAB — only shown when we have pin coords */}
            {pinCoords && (
              <Pressable style={[styles.fab, { backgroundColor: '#fff' }]} onPress={flyToPin}>
                <Ionicons name="location" size={20} color={colors.primaryGreen} />
              </Pressable>
            )}
          </View>

          {/* Location label badge */}
          <View style={[styles.badge, { bottom: insets.bottom + 90 }]}>
            <Ionicons name="location" size={13} color={colors.primaryGreen} />
            <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
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

  // ── Header ──────────────────────────────────────────────────
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Loading / Error ─────────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  statusText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // ── FABs ────────────────────────────────────────────────────
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

  // ── Location badge ──────────────────────────────────────────
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
