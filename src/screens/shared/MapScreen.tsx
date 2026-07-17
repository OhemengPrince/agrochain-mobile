import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, Region, PROVIDER_DEFAULT } from 'react-native-maps';
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

interface RouteInfo {
  coords: Coords[];
  distanceKm: string;
  durationMin: number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM     = 'https://router.project-osrm.org/route/v1/driving';
const DELTA_USER = 0.012;
const DELTA_PIN  = 0.08;

type MapLayerType = 'standard' | 'hybrid';

export default function MapScreen({ navigation, route }: Props) {
  const { title, subtitle, district, region } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [pinCoords, setPinCoords]     = useState<Coords | null>(null);
  const [userCoords, setUserCoords]   = useState<Coords | null>(null);
  const [geoError, setGeoError]       = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [mapLayer, setMapLayer]       = useState<MapLayerType>('standard');
  const [routeInfo, setRouteInfo]     = useState<RouteInfo | null>(null);
  const [routeVisible, setRouteVisible] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  const isFollowingRef = useRef(true);
  const watchRef       = useRef<Location.LocationSubscription | null>(null);
  const firstFixDone   = useRef(false);

  // ── Live GPS tracking ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (pos) => {
          if (cancelled) return;
          const coords: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserCoords(coords);

          if (!firstFixDone.current) {
            firstFixDone.current = true;
            mapRef.current?.animateToRegion(
              { ...coords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER },
              800
            );
          } else if (isFollowingRef.current) {
            mapRef.current?.animateToRegion(
              { ...coords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER },
              500
            );
          }
        }
      );
    })();

    return () => { cancelled = true; watchRef.current?.remove(); };
  }, []);

  // ── Geocode equipment pin ────────────────────────────────
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
        if (data?.length > 0) {
          setPinCoords({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
        } else {
          setGeoError(`Could not locate "${district}, ${region}" on the map.`);
        }
      } catch {
        if (!cancelled) setGeoError('Map unavailable. Check your internet connection.');
      }
    })();

    return () => { cancelled = true; };
  }, [district, region]);

  // ── Helpers ──────────────────────────────────────────────
  const updateFollowing = useCallback((val: boolean) => {
    isFollowingRef.current = val;
    setIsFollowing(val);
  }, []);

  const flyToUser = useCallback(() => {
    if (!userCoords) { Alert.alert('Location', 'Still acquiring your GPS position…'); return; }
    updateFollowing(true);
    mapRef.current?.animateToRegion(
      { ...userCoords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER }, 600
    );
  }, [userCoords, updateFollowing]);

  const flyToPin = useCallback(() => {
    if (!pinCoords) return;
    updateFollowing(false);
    mapRef.current?.animateToRegion(
      { ...pinCoords, latitudeDelta: DELTA_PIN, longitudeDelta: DELTA_PIN }, 600
    );
  }, [pinCoords, updateFollowing]);

  const toggleLayer = useCallback(() => {
    setMapLayer((prev) => prev === 'standard' ? 'hybrid' : 'standard');
  }, []);

  // ── Fetch OSRM route directions ──────────────────────────
  const toggleDirections = useCallback(async () => {
    if (routeVisible) {
      setRouteVisible(false);
      return;
    }
    if (!userCoords) { Alert.alert('Directions', 'Still acquiring your GPS position…'); return; }
    if (!pinCoords)  { Alert.alert('Directions', 'Equipment location is still loading…'); return; }

    setRouteLoading(true);
    try {
      const url = `${OSRM}/${userCoords.longitude},${userCoords.latitude};${pinCoords.longitude},${pinCoords.latitude}?geometries=geojson&overview=full`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.routes?.length > 0) {
        const r = data.routes[0];
        const coords: Coords[] = r.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon })
        );
        setRouteInfo({
          coords,
          distanceKm: (r.distance / 1000).toFixed(1),
          durationMin: Math.round(r.duration / 60),
        });
        setRouteVisible(true);
        updateFollowing(false);
        // Fit map to show the full route
        mapRef.current?.fitToCoordinates([userCoords, pinCoords], {
          edgePadding: { top: 100, right: 60, bottom: 220, left: 60 },
          animated: true,
        });
      } else {
        Alert.alert('Directions', 'No driving route found to this location.');
      }
    } catch {
      Alert.alert('Directions', 'Could not fetch directions. Check your internet connection.');
    } finally {
      setRouteLoading(false);
    }
  }, [routeVisible, userCoords, pinCoords, updateFollowing]);

  // ── Derived display state ────────────────────────────────
  const loading   = !pinCoords && !userCoords;
  const showError = !!geoError && !pinCoords && !userCoords;

  const initialRegion: Region | undefined = userCoords
    ? { ...userCoords, latitudeDelta: DELTA_USER, longitudeDelta: DELTA_USER }
    : pinCoords
    ? { ...pinCoords,  latitudeDelta: DELTA_PIN,  longitudeDelta: DELTA_PIN  }
    : undefined;

  const canShowDirections = !!(userCoords && pinCoords);
  const isSatellite = mapLayer === 'hybrid';

  return (
    <View style={styles.root}>

      {/* ── Header ── */}
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
            <Text style={styles.headerSub} numberOfLines={1}>{district}, {region} Region</Text>
          </View>
        </View>
        {userCoords && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── Content ── */}
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
            mapType={mapLayer}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass
            showsScale
            onPanDrag={() => updateFollowing(false)}
          >
            {/* Equipment pin */}
            {pinCoords && (
              <Marker
                coordinate={pinCoords}
                title={title}
                description={`${subtitle} · ${district}, ${region}`}
                pinColor="#1A6B2E"
              />
            )}

            {/* Driving route polyline */}
            {routeVisible && routeInfo && (
              <Polyline
                coordinates={routeInfo.coords}
                strokeColor="#1A6B2E"
                strokeWidth={4}
              />
            )}
          </MapView>

          {/* ── FABs (right column) ── */}
          <View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>

            {/* Navigate / follow-me */}
            <Pressable
              style={[styles.fab, { backgroundColor: isFollowing ? colors.primaryGreen : '#fff' }]}
              onPress={flyToUser}
            >
              <Ionicons
                name={isFollowing ? 'navigate' : 'navigate-outline'}
                size={20}
                color={isFollowing ? '#fff' : colors.primaryGreen}
              />
            </Pressable>

            {/* Fly to equipment pin */}
            {pinCoords && (
              <Pressable style={[styles.fab, { backgroundColor: '#fff' }]} onPress={flyToPin}>
                <Ionicons name="location" size={20} color={colors.primaryGreen} />
              </Pressable>
            )}

            {/* Satellite / map layer toggle */}
            <Pressable
              style={[styles.fab, { backgroundColor: isSatellite ? colors.primaryGreen : '#fff' }]}
              onPress={toggleLayer}
            >
              <Ionicons
                name={isSatellite ? 'earth' : 'earth-outline'}
                size={20}
                color={isSatellite ? '#fff' : colors.primaryGreen}
              />
            </Pressable>

            {/* Directions */}
            {canShowDirections && (
              <Pressable
                style={[styles.fab, { backgroundColor: routeVisible ? colors.primaryGreen : '#fff' }]}
                onPress={toggleDirections}
                disabled={routeLoading}
              >
                {routeLoading ? (
                  <ActivityIndicator size="small" color={routeVisible ? '#fff' : colors.primaryGreen} />
                ) : (
                  <Ionicons
                    name={routeVisible ? 'git-branch' : 'git-branch-outline'}
                    size={20}
                    color={routeVisible ? '#fff' : colors.primaryGreen}
                  />
                )}
              </Pressable>
            )}
          </View>

          {/* ── Route info card ── */}
          {routeVisible && routeInfo && (
            <View style={[styles.routeCard, { bottom: insets.bottom + 100 }]}>
              <Ionicons name="car-outline" size={18} color={colors.primaryGreen} />
              <View style={styles.routeTextWrap}>
                <Text style={[styles.routeDistance, { color: colors.text }]}>
                  {routeInfo.distanceKm} km
                </Text>
                <Text style={[styles.routeDuration, { color: colors.secondaryText }]}>
                  ~{routeInfo.durationMin} min by road
                </Text>
              </View>
              <Pressable onPress={() => setRouteVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
              </Pressable>
            </View>
          )}

          {/* ── Location label badge ── */}
          {!routeVisible && (
            <View style={[styles.badge, { bottom: insets.bottom + 100 }]}>
              <Ionicons name="location" size={13} color={colors.primaryGreen} />
              <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
                {district}, {region} Region
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  // ── Header ──────────────────────────────────────────────
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
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  // ── Loading / Error ──────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  statusText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },

  // ── FABs ────────────────────────────────────────────────
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

  // ── Route info card ──────────────────────────────────────
  routeCard: {
    position: 'absolute',
    left: 16,
    right: 72,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 4,
  },
  routeTextWrap: { flex: 1 },
  routeDistance: { fontSize: 15, fontWeight: '800' },
  routeDuration: { fontSize: 12, marginTop: 1 },

  // ── Location badge ───────────────────────────────────────
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
