/**
 * SurahBanner — Bandeau d'en-tête d'une sourate avec design luxueux
 * Accent doré, calligraphie arabe mise en valeur
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts';
import { Spacing } from '../../constants';

interface SurahBannerProps {
  arabicName: string;
  frenchName: string;
  subtitle?: string;
}

export const SurahBanner: React.FC<SurahBannerProps> = ({
  arabicName,
  frenchName,
  subtitle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.secondaryLight + '40' }]}>
      {/* Gold accent line */}
      <View style={[styles.goldLine, { backgroundColor: colors.secondary }]} />

      <Text style={[styles.arabicName, { color: colors.secondary }]}>
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

      {/* Bismillah */}
      <Text style={[styles.bismillah, { color: colors.secondary + 'AA' }]}>
        ﷽
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Spacing.radiusLg,
  },
  goldLine: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  arabicName: {
    fontSize: 24,
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
  bismillah: {
    fontSize: 28,
    marginTop: Spacing.md,
  },
});

export default SurahBanner;
