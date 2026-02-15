/**
 * DuaScreen - Ecran des invocations (Duas) avec lecteur audio
 * 3 Duas : Al-Iftitah, Kumayl, Munajat At-Ta'ibin
 * Design premium uniforme avec le reste de Sakina
 */

import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== TYPES =====
interface DuaItem {
  id: string;
  name: string;
  nameAr: string;
  subtitle: string;
  description: string;
  icon: string;
  audioFile: number; // require() asset module
}

interface DuaScreenProps {
  navigation?: {
    goBack?: () => void;
  };
  isDark?: boolean;
}

// ===== DONNEES DES 3 DUAS =====
const DUAS: DuaItem[] = [
  {
    id: 'iftitah',
    name: 'Dua Al-Iftitah',
    nameAr: '\u062F\u0639\u0627\u0621 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D',
    subtitle: 'Invocation d\'ouverture',
    description: 'Recitee pendant le mois de Ramadan',
    icon: 'moon-outline',
    audioFile: require('../../assets/sounds/duas/dua-iftitah-fr.m4a'),
  },
  {
    id: 'kumayl',
    name: 'Dua Kumayl',
    nameAr: '\u062F\u0639\u0627\u0621 \u0643\u0645\u064A\u0644',
    subtitle: 'Invocation du jeudi soir',
    description: 'Transmise par Kumayl ibn Ziyad de l\'Imam Ali (as)',
    icon: 'star-outline',
    audioFile: require('../../assets/sounds/duas/dua-kumayl-fr.mp3'),
  },
  {
    id: 'munajat',
    name: 'Munajat At-Ta\'ibin',
    nameAr: '\u0645\u0646\u0627\u062C\u0627\u0629 \u0627\u0644\u062A\u0627\u0626\u0628\u064A\u0646',
    subtitle: 'Entretien intime des repentants',
    description: 'Imam Zayn Al-Abidin (as) - As-Sahifa As-Sajjadiyya',
    icon: 'heart-outline',
    audioFile: require('../../assets/sounds/duas/munajat-taibin-fr.mp3'),
  },
];

const FAVORITES_KEY = 'sakina_dua_favorites';

// ===== COULEURS =====
const LightColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0FDF4',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#16a34a',
  primaryDeep: '#0F4C35',
  primaryDark: '#166534',
  gold: '#D4AF37',
  goldDark: '#B8860B',
  goldBg: 'rgba(212,175,55,0.15)',
  goldBorder: 'rgba(212,175,55,0.25)',
  cardShadow: '#000',
};

const DarkColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  primary: '#16a34a',
  primaryDeep: '#0F4C35',
  primaryDark: '#166534',
  gold: '#D4AF37',
  goldDark: '#B8860B',
  goldBg: 'rgba(212,175,55,0.12)',
  goldBorder: 'rgba(212,175,55,0.2)',
  cardShadow: '#000',
};

type ColorScheme = typeof LightColors;

// ===== FADE IN ANIMATION (meme pattern que App.tsx) =====
const FadeInView = ({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: any }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
};

// ===== COMPOSANT PRINCIPAL =====
export const DuaScreen: React.FC<DuaScreenProps> = ({ navigation, isDark = false }) => {
  const colors = isDark ? DarkColors : LightColors;
  const [selectedDua, setSelectedDua] = useState<DuaItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Charger favoris
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) setFavorites(JSON.parse(stored));
      } catch {}
    })();
  }, []);

  const goBack = useCallback(() => {
    if (selectedDua) {
      setSelectedDua(null);
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [selectedDua, navigation]);

  if (selectedDua) {
    return (
      <DuaPlayerScreen
        dua={selectedDua}
        colors={colors}
        isDark={isDark}
        favorites={favorites}
        setFavorites={setFavorites}
        onBack={() => setSelectedDua(null)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header gradient — meme pattern que Prieres/Coran/Home */}
      <LinearGradient
        colors={[colors.primaryDeep, colors.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Duas</Text>
          </View>
          <View style={styles.headerArabicBadge}>
            <Text style={styles.headerArabicText}>{'\u0627\u0644\u062F\u0639\u0627\u0621'}</Text>
          </View>
        </View>

        {/* Sous-titre decoratif */}
        <View style={styles.headerSubRow}>
          <View style={styles.goldDash} />
          <Text style={styles.headerSub}>Invocations</Text>
          <View style={styles.goldDash} />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banniere info — style gold/vert avec bordure gauche */}
        <FadeInView delay={100} style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={[styles.infoBanner, { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}>
            <View style={[styles.infoBannerAccent, { backgroundColor: colors.gold }]} />
            <Ionicons name="sparkles" size={18} color={colors.gold} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Section en developpement. D'autres invocations seront ajoutees prochainement.
            </Text>
          </View>
        </FadeInView>

        {/* Section titre */}
        <FadeInView delay={150} style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {DUAS.length} invocations disponibles
          </Text>
        </FadeInView>

        {/* Liste des Duas — cards premium avec ombre */}
        {DUAS.map((dua, index) => (
          <FadeInView key={dua.id} delay={200 + index * 80} style={{ paddingHorizontal: 16 }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDua(dua);
              }}
              style={({ pressed }) => [
                styles.duaCard,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.cardShadow,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              {/* Icon cercle gradient */}
              <LinearGradient
                colors={[colors.primaryDeep, colors.primary]}
                style={styles.duaCardIconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={dua.icon as any} size={22} color="#FFF" />
              </LinearGradient>

              <View style={styles.duaCardContent}>
                <View style={styles.duaCardNameRow}>
                  <Text style={[styles.duaCardTitle, { color: colors.text }]}>{dua.name}</Text>
                  <Text style={[styles.duaCardAr, { color: colors.gold }]}>{dua.nameAr}</Text>
                </View>
                <Text style={[styles.duaCardSubtitle, { color: colors.textSecondary }]}>{dua.subtitle}</Text>
              </View>

              <View style={[styles.duaCardChevron, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </View>
            </Pressable>
          </FadeInView>
        ))}
      </ScrollView>
    </View>
  );
};

// ===== ECRAN LECTEUR AUDIO =====
interface DuaPlayerProps {
  dua: DuaItem;
  colors: ColorScheme;
  isDark: boolean;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  onBack: () => void;
}

const DuaPlayerScreen: React.FC<DuaPlayerProps> = ({
  dua,
  colors,
  isDark,
  favorites,
  setFavorites,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressBarWidth = useRef(0);
  const isFavorite = favorites.includes(dua.id);

  // Callback de mise a jour du statut audio
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPositionMs(status.positionMillis || 0);
    setDurationMs(status.durationMillis || 0);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMs(0);
    }
  }, []);

  // Configurer le mode audio arriere-plan + precharger la duree
  useEffect(() => {
    const setup = async () => {
      // Mode audio arriere-plan
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Precharger pour obtenir la duree sans jouer
      const { sound, status } = await Audio.Sound.createAsync(
        dua.audioFile,
        { shouldPlay: false }
      );

      if (status.isLoaded && status.durationMillis) {
        setDurationMs(status.durationMillis);
      }

      // Garder le son pret pour la lecture
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
    };

    setup().catch(() => {});

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [dua.audioFile, onPlaybackStatusUpdate]);

  // Pulse animation for icon when playing
  useEffect(() => {
    if (isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying, pulseAnim]);

  const handlePlayPause = useCallback(async () => {
    try {
      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
      } else {
        // Fallback si le preload a echoue
        const { sound } = await Audio.Sound.createAsync(
          dua.audioFile,
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire l\'audio.');
    }
  }, [dua.audioFile, isPlaying, onPlaybackStatusUpdate]);

  const handleSeek = useCallback(async (offsetMs: number) => {
    if (!soundRef.current) return;
    const newPos = Math.max(0, Math.min(positionMs + offsetMs, durationMs));
    await soundRef.current.setPositionAsync(newPos);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [positionMs, durationMs]);

  const handleProgressPress = useCallback(async (event: any) => {
    if (!soundRef.current || durationMs === 0 || progressBarWidth.current === 0) return;
    const { locationX } = event.nativeEvent;
    const ratio = Math.max(0, Math.min(locationX / progressBarWidth.current, 1));
    const newPos = ratio * durationMs;
    await soundRef.current.setPositionAsync(newPos);
  }, [durationMs]);

  const toggleFavorite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newFavs = isFavorite
      ? favorites.filter((f) => f !== dua.id)
      : [...favorites, dua.id];
    setFavorites(newFavs);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
    } catch {}
  }, [isFavorite, favorites, dua.id, setFavorites]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${dua.name} - ${dua.subtitle}\n${dua.description}\n\nVia l'application Sakina`,
      });
    } catch {}
  }, [dua]);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header gradient */}
      <LinearGradient
        colors={[colors.primaryDeep, colors.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{dua.name}</Text>
          </View>
          <View style={styles.headerArabicBadge}>
            <Text style={styles.headerArabicText}>{dua.nameAr}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.playerContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icone centrale premium avec bordure gold */}
        <FadeInView delay={100}>
          <Animated.View
            style={[
              styles.playerIconOuter,
              {
                borderColor: colors.goldBorder,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primaryDeep, colors.primary]}
              style={styles.playerIconInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={dua.icon as any} size={48} color="#FFF" />
            </LinearGradient>
          </Animated.View>
        </FadeInView>

        {/* Info Dua */}
        <FadeInView delay={200}>
          <Text style={[styles.playerSubtitle, { color: colors.text }]}>{dua.subtitle}</Text>
          <View style={[styles.playerDescBadge, { backgroundColor: colors.goldBg, borderColor: colors.goldBorder }]}>
            <Text style={[styles.playerDescription, { color: colors.textSecondary }]}>{dua.description}</Text>
          </View>
        </FadeInView>

        {/* Barre de progression premium */}
        <FadeInView delay={300} style={styles.progressContainer}>
          <Pressable
            onPress={handleProgressPress}
            style={styles.progressBarOuter}
            onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
          >
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#334155' : '#E5E7EB' }]}>
              <LinearGradient
                colors={[colors.primary, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
              />
            </View>
            {/* Dot avec halo */}
            <View
              style={[
                styles.progressDotHalo,
                {
                  backgroundColor: colors.gold + '30',
                  left: `${progress * 100}%`,
                },
              ]}
            >
              <View style={[styles.progressDot, { backgroundColor: colors.gold }]} />
            </View>
          </Pressable>
          <View style={styles.progressTimes}>
            <Text style={[styles.progressTimeText, { color: colors.textSecondary }]}>
              {formatTime(positionMs)}
            </Text>
            <Text style={[styles.progressTimeText, { color: colors.textSecondary }]}>
              {durationMs > 0 ? formatTime(durationMs) : '--:--'}
            </Text>
          </View>
        </FadeInView>

        {/* Controles audio premium */}
        <FadeInView delay={400} style={styles.controlsRow}>
          <Pressable
            onPress={() => handleSeek(-15000)}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="play-back" size={24} color={colors.text} />
            <Text style={[styles.controlLabel, { color: colors.textMuted }]}>-15s</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            style={({ pressed }) => [
              styles.playBtnOuter,
              {
                borderColor: colors.gold + '40',
                transform: [{ scale: pressed ? 0.93 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primaryDeep, colors.primary]}
              style={styles.playBtnInner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#FFF"
                style={isPlaying ? {} : { marginLeft: 4 }}
              />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => handleSeek(15000)}
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name="play-forward" size={24} color={colors.text} />
            <Text style={[styles.controlLabel, { color: colors.textMuted }]}>+15s</Text>
          </Pressable>
        </FadeInView>

        {/* Actions : Favori + Partager */}
        <FadeInView delay={500} style={styles.actionsRow}>
          <Pressable
            onPress={toggleFavorite}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isFavorite
                  ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : colors.textSecondary}
            />
            <Text style={[styles.actionBtnText, { color: isFavorite ? '#EF4444' : colors.textSecondary }]}>
              Favori
            </Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Partager</Text>
          </Pressable>
        </FadeInView>
      </ScrollView>
    </View>
  );
};

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ===== HEADER (meme pattern que homeStyles/prieresStyles/coranStyles) =====
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  headerArabicBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  headerArabicText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  goldDash: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.3)',
  },

  // ===== INFO BANNER =====
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    paddingLeft: 18,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoBannerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // ===== SECTION =====
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ===== DUA CARD (premium style matching homeStyles.card) =====
  duaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  duaCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  duaCardContent: {
    flex: 1,
  },
  duaCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  duaCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  duaCardAr: {
    fontSize: 14,
    fontWeight: '600',
  },
  duaCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  duaCardChevron: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ===== PLAYER SCREEN =====
  playerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },

  // Icone centrale premium
  playerIconOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  playerIconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Info
  playerSubtitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  playerDescBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 36,
  },
  playerDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ===== PROGRESS BAR =====
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressBarOuter: {
    width: '100%',
    paddingVertical: 10,
    position: 'relative',
  },
  progressBarBg: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressDotHalo: {
    position: 'absolute',
    top: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressTimeText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'] as any,
  },

  // ===== CONTROLS =====
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  playBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== ACTIONS =====
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DuaScreen;
