/**
 * SurahBanner - Bandeau d'en-tête d'une sourate
 * Affiche le nom arabe, le nom français, et des infos optionnelles.
 * Réutilisé par CoranScreen (en ListHeader) et JuzReaderScreen (séparateur de sourate).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts';
import { Spacing } from '../../constants';

interface SurahBannerProps {
  arabicName: string;
  frenchName: string;
  /** Ligne d'info supplémentaire (ex: "286 versets • Médinoise" ou "N°2") */
  subtitle?: string;
}

export const SurahBanner: React.FC<SurahBannerProps> = ({
  arabicName,
  frenchName,
  subtitle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '10' }]}>
      <Text style={[styles.arabicName, { color: colors.primary }]}>
        {arabicName}
      </Text>
      <Text style={[styles.frenchName, { color: colors.text }]}>
        {frenchName}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Spacing.radiusMd,
  },
  arabicName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  frenchName: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default SurahBanner;
