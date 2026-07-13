import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  navigation: any;
  route: { params: { url: string; title: string } };
};

export default function NewsArticleScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { url, title } = route.params;

  const [loadDone, setLoadDone] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handleProgress = (p: number) => {
    Animated.timing(progressAnim, {
      toValue: p,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: Platform.OS === 'android' ? `${title}\n${url}` : title,
        url,
      } as any);
    } catch {}
  };

  const openInBrowser = () => {
    if (url) Linking.openURL(url);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Premium header */}
      <LinearGradient
        colors={['#0D3B1A', '#1A6B2E', '#2E8B45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Back button — frosted glass pill */}
        <TouchableOpacity
          style={styles.glassBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>

        {/* Center branding */}
        <View style={styles.headerCenter}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <Text style={styles.brandName}>AGROCHAIN</Text>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.brandSub}>News Feed</Text>
        </View>

        {/* Right actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={handleShare}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.glassBtn, { marginLeft: 8 }]}
            onPress={openInBrowser}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Animated progress bar */}
      {!loadDone && !loadError && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      )}

      {/* Error state */}
      {loadError ? (
        <View style={[styles.errorBox, { backgroundColor: colors.background }]}>
          <View style={[styles.errorIconWrap, { backgroundColor: colors.card }]}>
            <Ionicons name="wifi-off-outline" size={40} color={colors.secondaryText} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Could not load article</Text>
          <Text style={[styles.errorSub, { color: colors.secondaryText }]}>
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[styles.openBrowserBtn, { backgroundColor: colors.primaryGreen }]}
            onPress={openInBrowser}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={15} color="#fff" />
            <Text style={styles.openBrowserText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          onLoadProgress={({ nativeEvent }) => handleProgress(nativeEvent.progress)}
          onLoad={() => {
            handleProgress(1);
            setLoadDone(true);
          }}
          onError={() => setLoadError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 400) setLoadError(true);
          }}
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D3B1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
    paddingHorizontal: 12,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2.8,
  },
  brandSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#4ADE80',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  webview: {
    flex: 1,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 14,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  openBrowserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  openBrowserText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
