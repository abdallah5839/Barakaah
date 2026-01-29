/**
 * Composant ToggleButton
 * Bouton toggle pour activer/désactiver une option
 * Tous les boutons ont la même taille grâce à flex: 1
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
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // IMPORTANT: tous les boutons ont la même largeur
    height: 44, // Hauteur fixe identique pour tous
    borderRadius: 8, // Border radius uniforme
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14, // Taille de police IDENTIQUE pour tous
    fontWeight: '600', // Poids IDENTIQUE pour tous
    textAlign: 'center',
  },
});

export default ToggleButton;
