/**
 * TextControls - Barre de contrôles d'affichage du texte
 * Toggles arabe/français/phonétique + boutons A-/A+ pour la taille du texte arabe.
 * Réutilisé par CoranScreen et JuzReaderScreen.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../contexts';
import { Spacing } from '../../constants';

interface TextControlsProps {
  showArabic: boolean;
  showFrench: boolean;
  showPhonetic: boolean;
  arabicFontSize: number;
  onToggleArabic: () => void;
  onToggleFrench: () => void;
  onTogglePhonetic: () => void;
  onDecreaseFontSize: () => void;
  onIncreaseFontSize: () => void;
}

export const TextControls: React.FC<TextControlsProps> = ({
  showArabic,
  showFrench,
  showPhonetic,
  arabicFontSize,
  onToggleArabic,
  onToggleFrench,
  onTogglePhonetic,
  onDecreaseFontSize,
  onIncreaseFontSize,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Toggles */}
      <View style={styles.togglesRow}>
        <Pressable
          style={[styles.toggle, showArabic && { backgroundColor: colors.primary + '20' }]}
          onPress={onToggleArabic}
        >
          <Text style={[styles.toggleText, { color: showArabic ? colors.primary : colors.textSecondary }]}>
            عربي
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, showFrench && { backgroundColor: colors.primary + '20' }]}
          onPress={onToggleFrench}
        >
          <Text style={[styles.toggleText, { color: showFrench ? colors.primary : colors.textSecondary }]}>
            FR
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggle, showPhonetic && { backgroundColor: colors.primary + '20' }]}
          onPress={onTogglePhonetic}
        >
          <Text style={[styles.toggleText, { color: showPhonetic ? colors.primary : colors.textSecondary }]}>
            Phon.
          </Text>
        </Pressable>
      </View>

      {/* Font size */}
      <View style={styles.fontSizeRow}>
        <Pressable
          style={[styles.fontSizeBtn, { borderColor: colors.border }]}
          onPress={onDecreaseFontSize}
        >
          <Text style={[styles.fontSizeBtnText, { color: colors.text }]}>A-</Text>
        </Pressable>
        <Text style={[styles.fontSizeLabel, { color: colors.textSecondary }]}>{arabicFontSize}</Text>
        <Pressable
          style={[styles.fontSizeBtn, { borderColor: colors.border }]}
          onPress={onIncreaseFontSize}
        >
          <Text style={[styles.fontSizeBtnText, { color: colors.text }]}>A+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  togglesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Spacing.radiusSm,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fontSizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fontSizeLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 20,
    textAlign: 'center',
  },
});

export default TextControls;
