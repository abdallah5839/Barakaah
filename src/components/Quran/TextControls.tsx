/**
 * TextControls — Barre de contrôles d'affichage du texte
 * Design moderne avec pills arrondis et accent doré sur A-/A+
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../contexts';
import { Spacing, Shadows } from '../../constants';

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

  const Toggle = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      style={[
        styles.toggle,
        active
          ? { backgroundColor: colors.primaryLight }
          : { backgroundColor: colors.separator },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.toggleText, { color: active ? colors.primary : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
      <View style={styles.togglesRow}>
        <Toggle label="عربي" active={showArabic} onPress={onToggleArabic} />
        <Toggle label="FR" active={showFrench} onPress={onToggleFrench} />
        <Toggle label="Phon." active={showPhonetic} onPress={onTogglePhonetic} />
      </View>

      <View style={styles.fontSizeRow}>
        <Pressable
          style={[styles.fontSizeBtn, { backgroundColor: colors.secondaryLight }]}
          onPress={onDecreaseFontSize}
        >
          <Text style={[styles.fontSizeBtnText, { color: colors.secondary }]}>A-</Text>
        </Pressable>
        <Text style={[styles.fontSizeLabel, { color: colors.textMuted }]}>{arabicFontSize}</Text>
        <Pressable
          style={[styles.fontSizeBtn, { backgroundColor: colors.secondaryLight }]}
          onPress={onIncreaseFontSize}
        >
          <Text style={[styles.fontSizeBtnText, { color: colors.secondary }]}>A+</Text>
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
    gap: 6,
  },
  toggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Spacing.radiusFull,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fontSizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fontSizeLabel: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 20,
    textAlign: 'center',
  },
});

export default TextControls;
