/**
 * Composant PrayerCard
 * Affiche une prière individuelle dans la liste
 * Avec indicateurs visuels pour:
 * - Prières passées (grisées avec checkmark)
 * - Prochaine prière (bordure colorée + badge)
 * - Prières futures (style normal)
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import type { Prayer } from '../hooks';

interface PrayerCardProps {
  prayer: Prayer;
  countdown?: string;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  countdown,
}) => {
  const { colors } = useTheme();
  const { isPassed, isNext } = prayer;

  const getBackgroundColor = () => {
    if (isPassed) {
      return colors.surface + '80'; // 50% d'opacité pour les prières passées
    }
    if (isNext) {
      return colors.primary + '15'; // 15% d'opacité
    }
    return colors.surface;
  };

  const getBorderStyle = () => {
    if (isNext) {
      return {
        borderWidth: 2,
        borderColor: colors.primary,
      };
    }
    if (isPassed) {
      return {
        borderWidth: 1,
        borderColor: colors.border + '60',
      };
    }
    return {
      borderWidth: 1,
      borderColor: colors.border,
    };
  };

  const getTextColor = () => {
    if (isPassed) {
      return colors.textSecondary;
    }
    return colors.text;
  };

  const getTimeColor = () => {
    if (isNext) {
      return colors.primary;
    }
    if (isPassed) {
      return colors.textSecondary;
    }
    return colors.text;
  };

  return (
    <View
      style={[
        styles.container,
        !isPassed && Shadows.small,
        { backgroundColor: getBackgroundColor() },
        getBorderStyle(),
        isPassed && styles.passedContainer,
      ]}
    >
      <View style={styles.leftContent}>
        <View style={styles.nameRow}>
          {isPassed && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.success}
              style={styles.checkIcon}
            />
          )}
          <Text
            style={[
              styles.name,
              { color: getTextColor() },
              isPassed && styles.passedText,
            ]}
          >
            {prayer.nameFrench}
          </Text>
        </View>
        <Text
          style={[
            styles.arabic,
            { color: isPassed ? colors.textSecondary + '80' : colors.textSecondary },
          ]}
        >
          {prayer.nameArabic}
        </Text>
      </View>

      <View style={styles.rightContent}>
        <Text
          style={[
            styles.time,
            { color: getTimeColor() },
            isPassed && styles.passedTime,
          ]}
        >
          {prayer.timeString}
        </Text>
        {isNext && countdown && (
          <Text style={[styles.countdownLabel, { color: colors.primary }]}>
            Dans {countdown}
          </Text>
        )}
        {isNext && !countdown && (
          <Text style={[styles.nextLabel, { color: colors.primary }]}>
            Prochaine
          </Text>
        )}
        {isPassed && (
          <Text style={[styles.passedLabel, { color: colors.success }]}>
            Terminée
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Spacing.radiusMd,
    marginBottom: Spacing.sm,
  },
  passedContainer: {
    opacity: 0.85,
  },
  leftContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    marginRight: Spacing.xs,
  },
  name: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  passedText: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },
  arabic: {
    fontSize: Typography.sizes.md,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  passedTime: {
    fontSize: Typography.sizes.lg,
  },
  nextLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
  },
  countdownLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.xs,
  },
  passedLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.xs,
  },
});

export default PrayerCard;
