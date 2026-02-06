/**
 * Écran Coran (Lecteur)
 * Design aligné sur JuzReaderScreen :
 *   - Header fixe avec SurahPicker + TextControls
 *   - SurahBanner dans la FlatList
 *   - VerseItem avec arabicFontSize dynamique
 *   - Barre de lecture flottante avec prev/next/pause/stop + auto-advance
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  InteractionManager,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import { getVersesBySurah, surahs } from '../data';
import { SurahPicker, VerseItem, TextControls, SurahBanner } from '../components';
import type { Verse } from '../data';

// --- Audio helpers ---

/** Génère l'URL audio EveryAyah pour un verset donné */
const getVerseAudioUrl = (surahNumber: number, verseNumber: number): string => {
  const surah = String(surahNumber).padStart(3, '0');
  const verse = String(verseNumber).padStart(3, '0');
  return `https://everyayah.com/data/Alafasy_128kbps/${surah}${verse}.mp3`;
};

export const CoranScreen: React.FC = () => {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList<Verse>>(null);

  // État de la sourate sélectionnée
  const [selectedSurah, setSelectedSurah] = useState(1);

  // États des toggles d'affichage
  const [showArabic, setShowArabic] = useState(true);
  const [showFrench, setShowFrench] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [arabicFontSize, setArabicFontSize] = useState(24);

  // Versets de la sourate actuelle + état de chargement
  const [verses, setVerses] = useState<Verse[]>(getVersesBySurah(1));
  const [isLoading, setIsLoading] = useState(false);

  // --- État audio ---
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // Ref pour accéder aux valeurs fraîches dans les callbacks
  const playingVerseRef = useRef<number | null>(null);
  const selectedSurahRef = useRef(selectedSurah);
  const versesRef = useRef(verses);

  // Garder les refs synchronisées
  useEffect(() => { selectedSurahRef.current = selectedSurah; }, [selectedSurah]);
  useEffect(() => { versesRef.current = verses; }, [verses]);

  // Configurer le mode audio au montage
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // Charger les versets quand la sourate change
  useEffect(() => {
    setIsLoading(true);
    stopAudio();

    const task = InteractionManager.runAfterInteractions(() => {
      setVerses(getVersesBySurah(selectedSurah));
      setIsLoading(false);
    });

    return () => task.cancel();
  }, [selectedSurah]);

  // Scroll en haut quand les versets changent
  useEffect(() => {
    if (!isLoading && verses.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [verses, isLoading]);

  // --- Fonctions audio ---

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    playingVerseRef.current = null;
    setPlayingVerse(null);
    setIsPaused(false);
    setIsBuffering(false);
  }, []);

  const playVerse = useCallback(async (verseNumber: number) => {
    // Si on appuie sur le même verset en lecture → pause/reprise
    if (playingVerseRef.current === verseNumber && soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPaused(true);
        } else {
          await soundRef.current.playAsync();
          setIsPaused(false);
        }
        return;
      }
    }

    // Stopper l'audio précédent
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setIsBuffering(true);
    setIsPaused(false);
    playingVerseRef.current = verseNumber;
    setPlayingVerse(verseNumber);

    try {
      const url = getVerseAudioUrl(selectedSurahRef.current, verseNumber);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
      setIsBuffering(false);
    } catch {
      playingVerseRef.current = null;
      setPlayingVerse(null);
      setIsBuffering(false);
    }
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: any) => {
    if (!status.isLoaded) {
      if (status.isBuffering) setIsBuffering(true);
      return;
    }
    setIsBuffering(status.isBuffering ?? false);

    if (status.didJustFinish) {
      const currentVerse = playingVerseRef.current;
      const allVerses = versesRef.current;
      if (currentVerse !== null && currentVerse < allVerses.length) {
        playVerse(currentVerse + 1);
      } else {
        stopAudio();
      }
    }
  }, [playVerse, stopAudio]);

  const handleVersePlay = useCallback((verseNumber: number) => {
    playVerse(verseNumber);
  }, [playVerse]);

  // Trouver les infos de la sourate courante
  const currentSurah = surahs.find((s) => s.number === selectedSurah);

  // Renderer mémoïsé pour chaque verset
  const renderVerse = useCallback(({ item }: { item: Verse }) => (
    <VerseItem
      verse={item}
      showArabic={showArabic}
      showFrench={showFrench}
      showPhonetic={showPhonetic}
      arabicFontSize={arabicFontSize}
      isPlaying={playingVerse === item.number && !isPaused}
      isBuffering={playingVerse === item.number && isBuffering}
      onPlay={handleVersePlay}
    />
  ), [showArabic, showFrench, showPhonetic, arabicFontSize, playingVerse, isPaused, isBuffering, handleVersePlay]);

  const keyExtractor = useCallback((item: Verse) => String(item.number), []);

  // En-tête de la sourate (dans la FlatList)
  const ListHeader = useCallback(() => {
    if (!currentSurah) return null;
    const info = `${currentSurah.versesCount} versets \u2022 ${currentSurah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Médinoise'}`;
    return (
      <SurahBanner
        arabicName={currentSurah.arabicName}
        frenchName={currentSurah.frenchName}
        subtitle={info}
      />
    );
  }, [currentSurah]);

  // Message si tout est désactivé
  const ListEmpty = useCallback(() => {
    if (isLoading) return null;
    if (showArabic || showFrench || showPhonetic) return null;
    return (
      <View style={styles.noContentContainer}>
        <Text style={[styles.noContentText, { color: colors.textSecondary }]}>
          Activez au moins une option d'affichage pour voir les versets.
        </Text>
      </View>
    );
  }, [isLoading, showArabic, showFrench, showPhonetic, colors]);

  // Pied de liste (espacement pour la barre audio)
  const ListFooter = useCallback(() => (
    <View style={{ height: playingVerse !== null ? 100 : Spacing['4xl'] }} />
  ), [playingVerse]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ===== FIXED HEADER ===== */}
      <SurahPicker
        selectedSurah={selectedSurah}
        onSelectSurah={setSelectedSurah}
      />

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

      {/* ===== VERSE LIST ===== */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des versets...
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={verses}
          renderItem={renderVerse}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          extraData={{ showArabic, showFrench, showPhonetic, arabicFontSize, playingVerse, isPaused, isBuffering }}
        />
      )}

      {/* ===== FLOATING AUDIO PLAYER BAR ===== */}
      {playingVerse !== null && (
        <View style={[styles.playerBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.playerInfo}>
            <Text style={[styles.playerVerseNumber, { color: colors.primary }]} numberOfLines={1}>
              Verset {playingVerse}
            </Text>
            {currentSurah && (
              <Text style={[styles.playerSurahName, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentSurah.frenchName}
              </Text>
            )}
          </View>

          <View style={styles.playerControls}>
            <Pressable
              onPress={() => playingVerse > 1 && playVerse(playingVerse - 1)}
              style={({ pressed }) => [styles.playerSmallBtn, { opacity: pressed ? 0.5 : (playingVerse > 1 ? 1 : 0.3) }]}
              disabled={playingVerse <= 1}
              hitSlop={8}
            >
              <Ionicons name="play-skip-back" size={20} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => playVerse(playingVerse)}
              style={({ pressed }) => [
                styles.playerMainBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              hitSlop={4}
            >
              {isBuffering ? (
                <ActivityIndicator size={22} color="#FFF" />
              ) : (
                <Ionicons name={isPaused ? 'play' : 'pause'} size={22} color="#FFF" />
              )}
            </Pressable>

            <Pressable
              onPress={() => playingVerse < verses.length && playVerse(playingVerse + 1)}
              style={({ pressed }) => [styles.playerSmallBtn, { opacity: pressed ? 0.5 : (playingVerse < verses.length ? 1 : 0.3) }]}
              disabled={playingVerse >= verses.length}
              hitSlop={8}
            >
              <Ionicons name="play-skip-forward" size={20} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={stopAudio}
              style={({ pressed }) => [styles.playerSmallBtn, { opacity: pressed ? 0.5 : 1 }]}
              hitSlop={8}
            >
              <Ionicons name="stop" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  noContentText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  // --- Floating audio player bar ---
  playerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.screenHorizontal,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  playerInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  playerVerseNumber: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  playerSurahName: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playerSmallBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerMainBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CoranScreen;
