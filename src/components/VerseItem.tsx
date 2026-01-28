/**
 * Composant VerseItem
 * Affiche un verset avec texte arabe, français et phonétique
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import type { Verse } from '../data';

interface VerseItemProps {
  verse: Verse;
  showArabic: boolean;
  showFrench: boolean;
  showPhonetic: boolean;
}

export const VerseItem: React.FC<VerseItemProps> = ({
  verse,
  showArabic,
  showFrench,
  showPhonetic,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Numéro du verset */}
      <View style={[styles.verseBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.verseNumber}>{verse.number}</Text>
      </View>

      {/* Contenu du verset */}
      <View style={styles.content}>
        {/* Texte arabe */}
        {showArabic && (
          <Text style={[styles.arabicText, { color: colors.text }]}>
            {verse.arabic}
          </Text>
        )}

        {/* Traduction française */}
        {showFrench && (
          <Text style={[styles.frenchText, { color: colors.text }]}>
            {verse.french}
          </Text>
        )}

        {/* Phonétique */}
        {showPhonetic && (
          <Text style={[styles.phoneticText, { color: colors.textSecondary }]}>
            {verse.phonetic}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing['2xl'],
    borderBottomWidth: 1,
  },
  verseBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  verseNumber: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  content: {
    gap: Spacing.lg,
  },
  arabicText: {
    fontSize: Typography.sizes['2xl'],
    lineHeight: Typography.sizes['2xl'] * 2,
    textAlign: 'right',
    fontWeight: Typography.weights.regular,
    writingDirection: 'rtl',
  },
  frenchText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.6,
    textAlign: 'left',
  },
  phoneticText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.5,
    fontStyle: 'italic',
    textAlign: 'left',
  },
});

export default VerseItem;
