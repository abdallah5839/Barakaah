/**
 * VerseItem — Verset avec badge doré et design luxueux
 * Mémoïsé pour performance en FlatList
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
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
    <View style={[styles.container, { borderBottomColor: colors.separator }]}>
      {/* Header row: gold badge + play button */}
      <View style={styles.topRow}>
        <View style={[styles.verseBadge, { borderColor: colors.secondary }]}>
          <Text style={[styles.verseNumber, { color: colors.secondary }]}>{verse.number}</Text>
        </View>

        {onPlay && (
          <Pressable
            onPress={() => onPlay(verse.number)}
            style={({ pressed }) => [
              styles.playButton,
              {
                backgroundColor: isPlaying ? colors.primary : colors.primaryLight,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={8}
          >
            {isBuffering ? (
              <ActivityIndicator size={14} color={isPlaying ? '#FFF' : colors.primary} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={14}
                color={isPlaying ? '#FFF' : colors.primary}
              />
            )}
          </Pressable>
        )}
      </View>

      {/* Verse content */}
      <View style={styles.content}>
        {showArabic && (
          <Text
            style={[
              styles.arabicText,
              { color: colors.text },
              arabicFontSize != null && { fontSize: arabicFontSize, lineHeight: arabicFontSize * 2 },
            ]}
          >
            {verse.arabic}
          </Text>
        )}

        {showFrench && (
          <Text style={[styles.frenchText, { color: colors.textSecondary }]}>
            {verse.french}
          </Text>
        )}

        {showPhonetic && (
          <Text style={[styles.phoneticText, { color: colors.textMuted }]}>
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
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  verseBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verseNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing.md,
  },
  arabicText: {
    fontSize: Typography.sizes['2xl'],
    lineHeight: Typography.sizes['2xl'] * 2,
    textAlign: 'right',
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : 'serif',
    writingDirection: 'rtl',
  },
  frenchText: {
    fontSize: Typography.sizes.md,
    lineHeight: Typography.sizes.md * 1.7,
    textAlign: 'left',
  },
  phoneticText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.6,
    fontStyle: 'italic',
    textAlign: 'left',
  },
});

export default VerseItem;
