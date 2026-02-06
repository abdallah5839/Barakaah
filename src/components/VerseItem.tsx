/**
 * Composant VerseItem
 * Affiche un verset avec texte arabe, français et phonétique
 * Mémoïsé pour éviter les re-renders inutiles
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';
import type { Verse } from '../data';

interface VerseItemProps {
  verse: Verse;
  showArabic: boolean;
  showFrench: boolean;
  showPhonetic: boolean;
  isPlaying?: boolean;
  isBuffering?: boolean;
  onPlay?: (verseNumber: number) => void;
  arabicFontSize?: number;
}

const VerseItemInner: React.FC<VerseItemProps> = ({
  verse,
  showArabic,
  showFrench,
  showPhonetic,
  isPlaying = false,
  isBuffering = false,
  onPlay,
  arabicFontSize,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Ligne du haut : badge + bouton play */}
      <View style={styles.topRow}>
        <View style={[styles.verseBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.verseNumber}>{verse.number}</Text>
        </View>

        {onPlay && (
          <Pressable
            onPress={() => onPlay(verse.number)}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: isPlaying ? colors.primary : colors.primary + '15',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={8}
          >
            {isBuffering ? (
              <ActivityIndicator size={16} color={isPlaying ? '#FFF' : colors.primary} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={16}
                color={isPlaying ? '#FFF' : colors.primary}
              />
            )}
          </Pressable>
        )}
      </View>

      {/* Contenu du verset */}
      <View style={styles.content}>
        {showArabic && (
          <Text style={[
            styles.arabicText,
            { color: colors.text },
            arabicFontSize != null && { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2 },
          ]}>
            {verse.arabic}
          </Text>
        )}

        {showFrench && (
          <Text style={[styles.frenchText, { color: colors.text }]}>
            {verse.french}
          </Text>
        )}

        {showPhonetic && (
          <Text style={[styles.phoneticText, { color: colors.textSecondary }]}>
            {verse.phonetic}
          </Text>
        )}
      </View>
    </View>
  );
};

export const VerseItem = React.memo(VerseItemInner);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing['2xl'],
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  verseBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseNumber: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
