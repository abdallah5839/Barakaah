/**
 * Composant QuickAccessCard
 * Card pour les accès rapides sur la page d'accueil
 */

import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';

interface QuickAccessCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  icon,
  label,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        Shadows.small,
        { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={32} color={colors.primary} />
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    margin: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default QuickAccessCard;
