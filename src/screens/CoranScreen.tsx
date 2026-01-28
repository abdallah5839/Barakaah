/**
 * Écran Coran (Lecteur)
 * Affichage des versets avec toggles arabe/français/phonétique
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import { getVersesBySurah, isSurahAvailable, surahs } from '../data';
import { SurahPicker, ToggleButton, VerseItem } from '../components';
import type { Verse } from '../data';

export const CoranScreen: React.FC = () => {
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // État de la sourate sélectionnée
  const [selectedSurah, setSelectedSurah] = useState(1);

  // États des toggles d'affichage
  const [showArabic, setShowArabic] = useState(true);
  const [showFrench, setShowFrench] = useState(true);
  const [showPhonetic, setShowPhonetic] = useState(true);

  // Versets de la sourate actuelle
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Charger les versets quand la sourate change
  useEffect(() => {
    const available = isSurahAvailable(selectedSurah);
    setIsAvailable(available);

    if (available) {
      const surahVerses = getVersesBySurah(selectedSurah);
      setVerses(surahVerses);
    } else {
      setVerses([]);
    }

    // Scroll en haut lors du changement de sourate
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [selectedSurah]);

  // Trouver les infos de la sourate courante
  const currentSurah = surahs.find((s) => s.number === selectedSurah);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sélecteur de sourate */}
      <SurahPicker
        selectedSurah={selectedSurah}
        onSelectSurah={setSelectedSurah}
      />

      {/* Barre de toggles */}
      <View style={styles.togglesContainer}>
        <ToggleButton
          label="عربي"
          isActive={showArabic}
          onToggle={() => setShowArabic(!showArabic)}
        />
        <ToggleButton
          label="FR"
          isActive={showFrench}
          onToggle={() => setShowFrench(!showFrench)}
        />
        <ToggleButton
          label="Phonétique"
          isActive={showPhonetic}
          onToggle={() => setShowPhonetic(!showPhonetic)}
        />
      </View>

      {/* Contenu des versets */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête de la sourate */}
        {currentSurah && (
          <View style={styles.surahHeader}>
            <Text style={[styles.surahArabicName, { color: colors.primary }]}>
              {currentSurah.arabicName}
            </Text>
            <Text style={[styles.surahFrenchName, { color: colors.text }]}>
              {currentSurah.frenchName}
            </Text>
            <Text style={[styles.surahInfo, { color: colors.textSecondary }]}>
              {currentSurah.versesCount} versets • {currentSurah.revelationType === 'mecquoise' ? 'Mecquoise' : 'Médinoise'}
            </Text>
          </View>
        )}

        {/* Message si sourate non disponible */}
        {!isAvailable && (
          <View style={styles.unavailableContainer}>
            <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
              Les versets de cette sourate seront disponibles prochainement.
            </Text>
            <Text style={[styles.availableInfo, { color: colors.textSecondary }]}>
              Sourates disponibles : Al-Fatiha (1) et Al-Baqarah (2) - 5 premiers versets
            </Text>
          </View>
        )}

        {/* Liste des versets */}
        {isAvailable && verses.map((verse) => (
          <VerseItem
            key={verse.number}
            verse={verse}
            showArabic={showArabic}
            showFrench={showFrench}
            showPhonetic={showPhonetic}
          />
        ))}

        {/* Message si tout est désactivé */}
        {isAvailable && !showArabic && !showFrench && !showPhonetic && (
          <View style={styles.noContentContainer}>
            <Text style={[styles.noContentText, { color: colors.textSecondary }]}>
              Activez au moins une option d'affichage pour voir les versets.
            </Text>
          </View>
        )}

        {/* Espacement en bas */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  togglesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Répartition égale
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.screenHorizontal,
    gap: 8, // Espacement égal entre les boutons
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
  },
  surahHeader: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  surahArabicName: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  surahFrenchName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  surahInfo: {
    fontSize: Typography.sizes.sm,
  },
  unavailableContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
  },
  unavailableText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  availableInfo: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  noContentText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: Spacing['4xl'],
  },
});

export default CoranScreen;
