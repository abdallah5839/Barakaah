/**
 * Composant NextPrayerCard
 * Affiche la prochaine prière avec un design mis en avant (gradient)
 * Avec countdown temps réel et animation si urgente (< 5 min)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts';
import { Spacing, Typography, Shadows } from '../constants';
import type { Prayer, CountdownData } from '../hooks';

interface NextPrayerCardProps {
  prayer: Prayer | null;
  countdown: CountdownData;
  countdownString: string;
}

export const NextPrayerCard: React.FC<NextPrayerCardProps> = ({
  prayer,
  countdown,
  countdownString,
}) => {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation de pulsation si moins de 5 minutes
  useEffect(() => {
    if (countdown.isUrgent) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [countdown.isUrgent, pulseAnim]);

  if (!prayer) {
    return null;
  }

  // Couleurs du gradient selon le thème et l'urgence
  const getGradientColors = (): readonly [string, string, ...string[]] => {
    if (countdown.isUrgent) {
      // Rouge/orange pour l'urgence
      return isDark
        ? ['#F97316', '#EA580C'] // Orange (dark mode)
        : ['#EA580C', '#C2410C']; // Orange foncé (light mode)
    }
    return isDark
      ? ['#10B981', '#059669'] // Vert clair vers vert foncé (dark mode)
      : ['#059669', '#047857']; // Vert foncé vers plus foncé (light mode)
  };

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, Shadows.large]}
      >
        <View style={styles.header}>
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
          <Text style={styles.label}>Prochaine prière</Text>
          {countdown.isUrgent && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
              <Text style={styles.urgentText}>Bientôt!</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{prayer.nameFrench}</Text>
            <Text style={styles.prayerArabic}>{prayer.nameArabic}</Text>
          </View>

          <View style={styles.timeInfo}>
            <Text style={styles.time}>{prayer.timeString}</Text>
            <Text style={[styles.countdown, countdown.isUrgent && styles.urgentCountdown]}>
              {countdownString}
            </Text>
          </View>
        </View>

        {/* Barre de progression visuelle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  // Calculer le pourcentage (max 6h = 21600 secondes)
                  width: `${Math.min(100, ((21600 - countdown.totalSeconds) / 21600) * 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.radiusXl,
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: Spacing.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.radiusFull,
  },
  urgentText: {
    fontSize: Typography.sizes.xs,
    color: '#FFFFFF',
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.xs,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  prayerArabic: {
    fontSize: Typography.sizes.lg,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  countdown: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: Typography.weights.semibold,
  },
  urgentCountdown: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
});

export default NextPrayerCard;
