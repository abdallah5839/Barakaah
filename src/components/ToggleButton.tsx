/**
 * Composant ToggleButton
 * Bouton toggle pour activer/désactiver une option
 */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts';
import { Spacing, Typography } from '../constants';

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  isActive,
  onToggle,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.container,
        {
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: isActive ? '#FFFFFF' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44, // Zone tactile minimum recommandée pour mobile
    borderRadius: Spacing.radiusFull,
    borderWidth: 1,
    marginHorizontal: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});

export default ToggleButton;
