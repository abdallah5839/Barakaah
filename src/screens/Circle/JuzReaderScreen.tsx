/**
 * JuzReaderScreen - Lecteur de Juz pour le Cercle de Lecture
 * Affiche les versets du Juz sélectionné, groupés par sourate,
 * avec TextControls partagé, audio par verset, bookmark et bouton de complétion.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts';
import { useDevice } from '../../contexts/DeviceContext';
import { useCircleNavigation } from '../../navigation/CircleNavigator';
import { Spacing } from '../../constants';
import { getVersesBySurah } from '../../data/verses';
import { surahs } from '../../data/surahs';
import { getJuzByNumber } from '../../data/juzData';
import { VerseItem } from '../../components/VerseItem';
import { TextControls } from '../../components/Quran/TextControls';
import { SurahBanner } from '../../components/Quran/SurahBanner';
import {
  markJuzInProgress,
  markJuzCompleted,
} from '../../services/circleService';
import type { Verse } from '../../data/verses';

// ===== TYPES =====

interface JuzSection {
  surahNumber: number;
  surahName: string;
  surahNameAr: string;
  verses: Verse[];
}

/** Items rendus dans la FlatList */
type ListItem =
  | { type: 'header'; surahNumber: number; surahName: string; surahNameAr: string; key: string }
  | { type: 'verse'; verse: Verse; surahNumber: number; key: string }
  | { type: 'footer'; key: string };

// ===== HELPERS =====

const pad3 = (n: number): string => String(n).padStart(3, '0');

const getAudioUrl = (surahNumber: number, verseNumber: number): string =>
  `https://everyayah.com/data/Alafasy_128kbps/${pad3(surahNumber)}${pad3(verseNumber)}.mp3`;

const BOOKMARK_PREFIX = 'barakaah_juz_bookmark_';

const getBookmarkKey = (circleId: string, juzNumber: number): string =>
  `${BOOKMARK_PREFIX}${circleId}_${juzNumber}`;

// ===== COMPONENT =====

export const JuzReaderScreen: React.FC = () => {
  const { colors } = useTheme();
  const { goBack, currentRoute } = useCircleNavigation();
  const { deviceId } = useDevice();

  const params = 'params' in currentRoute ? (currentRoute as any).params : {};
  const circleId: string = params?.circleId || '';
  const juzNumber: number = params?.juzNumber || 1;

  // Display toggles
  const [showArabic, setShowArabic] = useState(true);
  const [showFrench, setShowFrench] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState(24);

  // Audio state
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Completion
  const [isCompleting, setIsCompleting] = useState(false);

  // FlatList ref for bookmark scroll
  const flatListRef = useRef<FlatList<ListItem>>(null);

  // Juz info
  const juzInfo = useMemo(() => getJuzByNumber(juzNumber), [juzNumber]);

  // Build sections: group verses by surah
  const sections: JuzSection[] = useMemo(() => {
    if (!juzInfo) return [];
    const result: JuzSection[] = [];
    for (let s = juzInfo.start_surah_number; s <= juzInfo.end_surah_number; s++) {
      const allVerses = getVersesBySurah(s);
      const surahMeta = surahs.find(su => su.number === s);
      if (!surahMeta) continue;

      let filtered: Verse[];
      if (s === juzInfo.start_surah_number && s === juzInfo.end_surah_number) {
        filtered = allVerses.filter(v => v.number >= juzInfo.start_verse && v.number <= juzInfo.end_verse);
      } else if (s === juzInfo.start_surah_number) {
        filtered = allVerses.filter(v => v.number >= juzInfo.start_verse);
      } else if (s === juzInfo.end_surah_number) {
        filtered = allVerses.filter(v => v.number <= juzInfo.end_verse);
      } else {
        filtered = allVerses;
      }

      if (filtered.length > 0) {
        result.push({
          surahNumber: s,
          surahName: surahMeta.frenchName,
          surahNameAr: surahMeta.arabicName,
          verses: filtered,
        });
      }
    }
    return result;
  }, [juzInfo]);

  // Flatten sections into FlatList items
  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    for (const section of sections) {
      items.push({
        type: 'header',
        surahNumber: section.surahNumber,
        surahName: section.surahName,
        surahNameAr: section.surahNameAr,
        key: `header-${section.surahNumber}`,
      });
      for (const verse of section.verses) {
        items.push({
          type: 'verse',
          verse,
          surahNumber: section.surahNumber,
          key: `verse-${section.surahNumber}-${verse.number}`,
        });
      }
    }
    items.push({ type: 'footer', key: 'footer' });
    return items;
  }, [sections]);

  // Subtitle: range description
  const subtitle = useMemo(() => {
    if (!juzInfo) return '';
    if (juzInfo.start_surah_number === juzInfo.end_surah_number) {
      return `${juzInfo.start_surah} (${juzInfo.start_verse}-${juzInfo.end_verse})`;
    }
    return `${juzInfo.start_surah} (${juzInfo.start_verse}) \u2192 ${juzInfo.end_surah} (${juzInfo.end_verse})`;
  }, [juzInfo]);

  // ===== BOOKMARK =====

  useEffect(() => {
    const restoreBookmark = async () => {
      try {
        const saved = await AsyncStorage.getItem(getBookmarkKey(circleId, juzNumber));
        if (saved) {
          const index = parseInt(saved, 10);
          if (!isNaN(index) && index > 0 && index < listData.length) {
            setTimeout(() => {
              Alert.alert(
                'Reprendre la lecture ?',
                'Tu avais commencé ce Juz. Reprendre où tu en étais ?',
                [
                  { text: 'Non', style: 'cancel' },
                  {
                    text: 'Reprendre',
                    onPress: () => {
                      flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 0 });
                    },
                  },
                ],
              );
            }, 600);
          }
        }
      } catch {
        // ignore
      }
    };
    if (listData.length > 1) {
      restoreBookmark();
    }
  }, [circleId, juzNumber, listData.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0) {
      const lastVisible = viewableItems[viewableItems.length - 1];
      if (lastVisible.index != null && lastVisible.index > 0) {
        AsyncStorage.setItem(
          getBookmarkKey(circleId, juzNumber),
          String(lastVisible.index),
        ).catch(() => {});
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // ===== AUDIO =====

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch((err) => {
      console.warn('[JuzReader] Audio mode setup failed:', err);
    });
  }, []);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setPlayingKey(null);
    setIsBuffering(false);
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handlePlay = useCallback(async (surahNumber: number, verseNumber: number) => {
    const key = `${surahNumber}-${verseNumber}`;
    const url = getAudioUrl(surahNumber, verseNumber);
    console.log(`[JuzReader] Play pressed: surah=${surahNumber}, verse=${verseNumber}, url=${url}`);

    if (playingKey === key) {
      console.log('[JuzReader] Stopping current audio');
      await stopAudio();
      return;
    }

    await stopAudio();

    try {
      setPlayingKey(key);
      setIsBuffering(true);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopAudio();
          }
        },
      );

      soundRef.current = sound;
      setIsBuffering(false);
      console.log('[JuzReader] Audio playing successfully');
    } catch (error) {
      console.error('[JuzReader] Audio playback error:', error);
      setPlayingKey(null);
      setIsBuffering(false);
    }
  }, [playingKey, stopAudio]);

  // ===== COMPLETION =====

  const handleMarkCompleted = useCallback(async () => {
    if (!deviceId || !circleId) return;
    setIsCompleting(true);

    try {
      const progressResult = await markJuzInProgress({ circleId, juzNumber, deviceId });
      if (!progressResult.success && !progressResult.error?.includes('déjà')) {
        Alert.alert('Erreur', progressResult.error || 'Impossible de mettre à jour.');
        setIsCompleting(false);
        return;
      }

      const result = await markJuzCompleted({ circleId, juzNumber, deviceId });
      if (result.success && result.data) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await AsyncStorage.removeItem(getBookmarkKey(circleId, juzNumber)).catch(() => {});

        if (result.data.circleCompleted) {
          Alert.alert(
            'Khatma Complète !',
            'Qu\'Allah accepte votre lecture.\n\nVotre cercle a terminé la lecture complète du Coran !',
            [{ text: 'Alhamdulillah', onPress: goBack }],
          );
        } else {
          Alert.alert(
            'Bravo !',
            `Tu as terminé le Juz ${juzNumber} !`,
            [{ text: 'OK', onPress: goBack }],
          );
        }
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de mettre à jour.');
      }
    } catch {
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setIsCompleting(false);
    }
  }, [deviceId, circleId, juzNumber, goBack]);

  // ===== RENDER HELPERS =====

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.type === 'header') {
      return (
        <SurahBanner
          arabicName={item.surahNameAr}
          frenchName={`Sourate ${item.surahName}`}
          subtitle={`N\u00b0${item.surahNumber}`}
        />
      );
    }

    if (item.type === 'verse') {
      const verseKey = `${item.surahNumber}-${item.verse.number}`;
      return (
        <VerseItem
          verse={item.verse}
          showArabic={showArabic}
          showFrench={showFrench}
          showPhonetic={showPhonetic}
          arabicFontSize={arabicFontSize}
          isPlaying={playingKey === verseKey}
          isBuffering={isBuffering && playingKey === verseKey}
          onPlay={() => handlePlay(item.surahNumber, item.verse.number)}
        />
      );
    }

    // Footer
    return (
      <View style={styles.footerContainer}>
        <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
          Fin du Juz {juzNumber}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.completeBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            isCompleting && { opacity: 0.6 },
          ]}
          onPress={handleMarkCompleted}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.completeBtnText}>Marquer comme terminé</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }, [
    colors, showArabic, showFrench, showPhonetic, arabicFontSize,
    playingKey, isBuffering, handlePlay, juzNumber,
    isCompleting, handleMarkCompleted,
  ]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  // ===== MAIN RENDER =====

  if (!juzInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textSecondary }}>Juz introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backButton, { backgroundColor: colors.surface }]} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Juz {juzNumber}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Shared controls bar */}
      <TextControls
        showArabic={showArabic}
        showFrench={showFrench}
        showPhonetic={showPhonetic}
        arabicFontSize={arabicFontSize}
        onToggleArabic={() => setShowArabic(v => !v)}
        onToggleFrench={() => setShowFrench(v => !v)}
        onTogglePhonetic={() => setShowPhonetic(v => !v)}
        onDecreaseFontSize={() => setArabicFontSize(s => Math.max(20, s - 2))}
        onIncreaseFontSize={() => setArabicFontSize(s => Math.min(36, s + 2))}
      />

      {/* Verse list */}
      <FlatList
        ref={flatListRef}
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={(info) => {
          flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
      />
    </SafeAreaView>
  );
};

// ===== STYLES =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  // List
  listContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingBottom: Spacing['4xl'],
  },
  // Footer
  footerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.lg,
  },
  footerLine: {
    width: 60,
    height: 2,
    borderRadius: 1,
  },
  footerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: Spacing.radiusMd,
  },
  completeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default JuzReaderScreen;
